import argparse
import socket
import uvicorn
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_lan_ip():
    """
    Returns the primary LAN IP of the current machine.
    Works by opening a dummy UDP socket to a public IP.
    It doesn't actually send any data.
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Doesn't have to be reachable, just needs to route externally
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SpeakFlow V2 Backend Server")
    parser.add_argument(
        "--local-host", 
        action="store_true", 
        help="Bind the server to the LAN IP so other devices on the network can connect"
    )
    args = parser.parse_args()

    if args.local_host:
        host = get_lan_ip()
        logger.info(f"Starting server on LAN IP: {host}")
    else:
        host = "127.0.0.1"
        logger.info(f"Starting server on localhost: {host}")

    uvicorn.run("app.main:app", host=host, port=8000, reload=True)
