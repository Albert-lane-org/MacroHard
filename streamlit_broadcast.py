import asyncio
from collections import deque
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
import html
import inspect
import ipaddress
import queue
import socket
import ssl
import threading
import time
from urllib.parse import quote, urlparse, urlunparse
import uuid
import streamlit as st
import websockets

# Configuration & Hardening Limits
MAX_LOG_ENTRIES = 100
MAX_FRAME_BUFFER = 10
MAX_PAYLOAD_LEN = 2000
MAX_URI_LEN = 2048
MAX_IDLE_SECONDS = 300
DNS_TIMEOUT_SECONDS = 3.0
DEFAULT_WS_URI = "wss://your-broadcast-server.example.com/feed"


@st.cache_resource
def get_dns_executor():
    return ThreadPoolExecutor(max_workers=4)


st.set_page_config(page_title="Broadcast Hub", layout="wide")
st.title("Streamlit Broadcast Engine")

# Shared Thread-Safe State & Queues
if "ws_queue" not in st.session_state:
    st.session_state.ws_queue = queue.Queue(maxsize=MAX_LOG_ENTRIES)

if "conn_stop_event" not in st.session_state:
    st.session_state.conn_stop_event = None

if "ws_buffer" not in st.session_state:
    st.session_state.ws_buffer = deque(maxlen=MAX_FRAME_BUFFER)

if "ws_status" not in st.session_state:
    st.session_state.ws_status = "Disconnected"

if "ws_thread" not in st.session_state:
    st.session_state.ws_thread = None

if "current_conn_id" not in st.session_state:
    st.session_state.current_conn_id = None


def safe_queue_put(msg_queue: queue.Queue, item: tuple):
    """Safely pushes items to bounded queue without blocking worker thread."""
    try:
        msg_queue.put_nowait(item)
    except queue.Full:
        pass


def extract_embedded_ipv4(ip_obj: ipaddress.IPv6Address) -> list[ipaddress.IPv4Address]:
    """Extracts all embedded IPv4 addresses from IPv6 transition mechanisms (6to4, Teredo, NAT64, ISATAP, IPv4-mapped, IPv4-compatible)."""
    v4_addrs = []

    if getattr(ip_obj, "ipv4_mapped", None) and ip_obj.ipv4_mapped:
        v4_addrs.append(ip_obj.ipv4_mapped)

    # IPv4-Compatible IPv6 (Deprecated ::/96)
    if ip_obj.in_network(ipaddress.IPv6Network("::/96")) and int(ip_obj) != 0:
        v4_int = int(ip_obj) & 0xFFFFFFFF
        v4_addrs.append(ipaddress.IPv4Address(v4_int))

    # 6to4: 2002::/16 -> bits 16..48
    if ip_obj.in_network(ipaddress.IPv6Network("2002::/16")):
        v4_int = (int(ip_obj) >> 80) & 0xFFFFFFFF
        v4_addrs.append(ipaddress.IPv4Address(v4_int))

    # NAT64 Well-Known Prefix (64:ff9b::/96)
    if ip_obj.in_network(ipaddress.IPv6Network("64:ff9b::/96")):
        v4_int = int(ip_obj) & 0xFFFFFFFF
        v4_addrs.append(ipaddress.IPv4Address(v4_int))

    # NAT64 Local Prefix (64:ff9b:1::/48) -> RFC 6052 (bits 48..63 + bits 72..87)
    if ip_obj.in_network(ipaddress.IPv6Network("64:ff9b:1::/48")):
        v4_high = (int(ip_obj) >> 64) & 0xFFFF
        v4_low = (int(ip_obj) >> 40) & 0xFFFF
        v4_int = (v4_high << 16) | v4_low
        v4_addrs.append(ipaddress.IPv4Address(v4_int))

    # Teredo: 2001:0::/32 -> Server IP (bits 32..63) and Client IP (bits 96..127 inverted)
    if ip_obj.in_network(ipaddress.IPv6Network("2001:0::/32")):
        server_v4_int = (int(ip_obj) >> 64) & 0xFFFFFFFF
        client_v4_int = (~int(ip_obj)) & 0xFFFFFFFF
        v4_addrs.append(ipaddress.IPv4Address(server_v4_int))
        v4_addrs.append(ipaddress.IPv4Address(client_v4_int))

    # ISATAP: Interface identifier contains 0000:5EFE or 0200:5EFE in bits 32..63
    isatap_marker = (int(ip_obj) >> 32) & 0xFFFFFFFF
    if isatap_marker in (0x00005EFE, 0x02005EFE):
        v4_int = int(ip_obj) & 0xFFFFFFFF
        v4_addrs.append(ipaddress.IPv4Address(v4_int))

    return v4_addrs


def is_ip_restricted(ip_obj: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Strictly validates IP address to prevent SSRF against internal/reserved networks and IPv6 tunnels."""
    if isinstance(ip_obj, ipaddress.IPv6Address):
        for embedded_v4 in extract_embedded_ipv4(ip_obj):
            if is_ip_restricted(embedded_v4):
                return True

    return (
        not ip_obj.is_global
        or ip_obj.is_private
        or ip_obj.is_loopback
        or ip_obj.is_link_local
        or ip_obj.is_reserved
        or ip_obj.is_multicast
        or ip_obj.is_unspecified
        or getattr(ip_obj, "is_shared", False)
    )


def resolve_host_ip_sync(hostname: str) -> tuple[bool, str, str]:
    """Resolves hostname within cached worker pool, normalizing IPv4-mapped IPv6 addresses and enforcing strict global IP scope."""

    def _resolve():
        return socket.getaddrinfo(hostname, None, family=socket.AF_UNSPEC)

    try:
        executor = get_dns_executor()
        future = executor.submit(_resolve)
        ip_list = future.result(timeout=DNS_TIMEOUT_SECONDS)

        if not ip_list:
            return False, "No valid IP addresses returned.", ""

        valid_ip = None
        for item in ip_list:
            ip_str = item[4][0]
            clean_ip_str = ip_str.split("%")[0]

            try:
                ip_obj = ipaddress.ip_address(clean_ip_str)
            except ValueError:
                return False, f"Invalid IP address format returned: {clean_ip_str}", ""

            if getattr(ip_obj, "ipv4_mapped", None):
                ip_obj = ip_obj.ipv4_mapped

            if is_ip_restricted(ip_obj):
                return False, f"Access to restricted address ({clean_ip_str}) is denied.", ""

            if not valid_ip:
                valid_ip = str(ip_obj)

        return True, "", valid_ip
    except FutureTimeoutError:
        return False, "DNS resolution timed out.", ""
    except Exception:
        return False, "Endpoint resolution failed.", ""


def is_safe_endpoint(uri: str) -> tuple[bool, str, str]:
    """Validates URI length, scheme, control character cleanliness, and host range safety."""
    if len(uri) > MAX_URI_LEN:
        return False, f"URI length exceeds limit ({MAX_URI_LEN} characters).", ""

    if any(char in uri for char in ("\r", "\n", "\0", "\t")):
        return False, "Invalid control characters detected in URI.", ""

    try:
        parsed = urlparse(uri)
        if parsed.scheme not in ("ws", "wss"):
            return False, "Invalid scheme. URI must start with 'ws://' or 'wss://'.", ""

        hostname = parsed.hostname
        if not hostname:
            return False, "Invalid endpoint host.", ""

        return resolve_host_ip_sync(hostname)
    except Exception:
        return False, "URI parsing error encountered.", ""


@st.fragment(run_every="1s")
def render_live_feed():
    """Polls queue atomically and updates frame buffer, dropping stale connection messages."""
    while True:
        try:
            msg_conn_id, msg_type, content = st.session_state.ws_queue.get_nowait()

            if msg_conn_id != st.session_state.current_conn_id:
                continue

            if msg_type == "status":
                st.session_state.ws_status = content
            elif msg_type == "data":
                st.session_state.ws_buffer.appendleft((content, time.strftime("%H:%M:%S")))
        except queue.Empty:
            break

    safe_status = (
        html.escape(st.session_state.ws_status)
        .replace("*", "\\*")
        .replace("_", "\\_")
        .replace("`", "\\`")
        .replace("[", "\\[")
        .replace("]", "\\]")
    )
    st.caption(f"Status: **{safe_status}**")
    if st.session_state.ws_buffer:
        st.subheader("Live Broadcast Terminal")
        for content, ts in st.session_state.ws_buffer:
            st.code(f"[{ts}] {content}", language="text")


def run_ws_thread(target_uri: str, resolved_ip: str, msg_queue: queue.Queue, stop_evt: threading.Event, conn_id: str):
    """Worker function binding directly to pre-screened IP with bounded handshake/close timeouts and TLS parameters."""

    async def listen():
        idle_start = time.time()
        try:
            parsed = urlparse(target_uri)
            ip_obj = ipaddress.ip_address(resolved_ip)

            userinfo = ""
            if parsed.username:
                user = quote(parsed.username, safe="")
                pwd = f":{quote(parsed.password, safe='')}" if parsed.password else ""
                userinfo = f"{user}{pwd}@"

            netloc_ip = f"{userinfo}[{resolved_ip}]" if ip_obj.version == 6 else f"{userinfo}{resolved_ip}"
            if parsed.port:
                netloc_ip += f":{parsed.port}"

            direct_ip_uri = urlunparse(
                (parsed.scheme, netloc_ip, parsed.path, parsed.params, parsed.query, parsed.fragment)
            )

            safe_queue_put(msg_queue, (conn_id, "status", "Connecting..."))

            host_name = f"[{parsed.hostname}]" if ":" in parsed.hostname else parsed.hostname
            host_header = f"{host_name}:{parsed.port}" if parsed.port else host_name

            headers = {"Host": host_header}
            connect_kwargs = {
                "ping_interval": 20,
                "ping_timeout": 10,
                "open_timeout": 3.0,
                "close_timeout": 3.0,
            }

            sig_params = inspect.signature(websockets.connect).parameters
            if "additional_headers" in sig_params:
                connect_kwargs["additional_headers"] = headers
            else:
                connect_kwargs["extra_headers"] = headers

            if parsed.scheme == "wss":
                ssl_ctx = ssl.create_default_context()
                ssl_ctx.check_hostname = True
                ssl_ctx.verify_mode = ssl.CERT_REQUIRED
                connect_kwargs["ssl"] = ssl_ctx
                connect_kwargs["server_hostname"] = parsed.hostname

            async with websockets.connect(direct_ip_uri, **connect_kwargs) as websocket:
                safe_queue_put(msg_queue, (conn_id, "status", "Connected"))
                while not stop_evt.is_set():
                    if time.time() - idle_start > MAX_IDLE_SECONDS:
                        safe_queue_put(msg_queue, (conn_id, "status", "Terminated (Idle Timeout)"))
                        break
                    try:
                        raw_data = await asyncio.wait_for(websocket.recv(), timeout=0.2)
                        payload = str(raw_data)[:MAX_PAYLOAD_LEN]
                        safe_queue_put(msg_queue, (conn_id, "data", payload))
                        idle_start = time.time()
                    except asyncio.TimeoutError:
                        continue
        except websockets.exceptions.ConnectionClosed as e:
            safe_queue_put(msg_queue, (conn_id, "status", f"Closed: {e.code}"))
        except Exception:
            safe_queue_put(msg_queue, (conn_id, "status", "Connection Error"))

    try:
        asyncio.run(listen())
    except Exception:
        safe_queue_put(msg_queue, (conn_id, "status", "Thread Exception Encountered"))


tab_gen, tab_ws, tab_state = st.tabs(["Data Generator", "WebSocket Feed", "Session State Log"])

# --- 1. Native Token Stream ---
with tab_gen:
    st.header("Native Generator Stream")

    def data_generator():
        messages = ["Connecting to feed...", "Receiving payloads...", "Processing event...", "Complete."]
        for word in messages:
            yield word + " "
            time.sleep(0.5)

    if st.button("Start Generator Broadcast", key="btn_gen"):
        st.write_stream(data_generator)

# --- 2. Live Auto-Refreshing WebSocket Receiver ---
with tab_ws:
    st.header("Live WebSocket Listener")
    ws_url = st.text_input("WebSocket Endpoint", value=DEFAULT_WS_URI)

    col_conn, col_disc = st.columns([1, 1])
    with col_conn:
        if st.button("Connect to Broadcast", key="btn_ws"):
            is_valid, err_msg, target_ip = is_safe_endpoint(ws_url)
            if not is_valid:
                st.error(err_msg)
            else:
                if st.session_state.conn_stop_event:
                    st.session_state.conn_stop_event.set()

                if st.session_state.ws_thread and st.session_state.ws_thread.is_alive():
                    st.session_state.ws_thread.join(timeout=1.0)

                conn_stop_event = threading.Event()
                st.session_state.conn_stop_event = conn_stop_event
                st.session_state.ws_buffer.clear()
                st.session_state.current_conn_id = str(uuid.uuid4())

                while True:
                    try:
                        st.session_state.ws_queue.get_nowait()
                    except queue.Empty:
                        break

                thread = threading.Thread(
                    target=run_ws_thread,
                    args=(
                        ws_url,
                        target_ip,
                        st.session_state.ws_queue,
                        conn_stop_event,
                        st.session_state.current_conn_id,
                    ),
                    daemon=True,
                )
                thread.start()
                st.session_state.ws_thread = thread
                st.info("Listener process dispatched.")

    with col_disc:
        if st.button("Disconnect Feed", key="btn_disc"):
            if st.session_state.conn_stop_event:
                st.session_state.conn_stop_event.set()
            if st.session_state.ws_thread and st.session_state.ws_thread.is_alive():
                st.session_state.ws_thread.join(timeout=1.0)
            st.session_state.ws_status = "Disconnected (User Triggered)"
            st.warning("Disconnect signal sent.")

    render_live_feed()

# --- 3. Atomic Bounded State Broadcast ---
with tab_state:
    st.header("Event State Log")

    if "broadcast_log" not in st.session_state:
        st.session_state.broadcast_log = deque(maxlen=MAX_LOG_ENTRIES)

    def push_event(event_text: str):
        sanitized = str(event_text)[:MAX_PAYLOAD_LEN]
        st.session_state.broadcast_log.appendleft(sanitized)

    st.button("Trigger Event", on_click=push_event, args=("New Security Alert Logged",), key="btn_state")

    st.subheader("Event Feed")
    for msg in st.session_state.broadcast_log:
        st.text(f"- {msg}")
