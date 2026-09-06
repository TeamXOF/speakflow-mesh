import socket
import time

class NetworkMonitor:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(NetworkMonitor, cls).__new__(cls)
            cls._instance._last_check_time = 0
            cls._instance._last_status = False
            cls._instance._ttl = 5.0  # 5 seconds cache
        return cls._instance

    def is_available(self) -> bool:
        current_time = time.time()
        
        # Return cached result if within TTL
        if current_time - self._last_check_time < self._ttl:
            return self._last_status

        # Perform reachability probe
        try:
            # 8.8.8.8 is Google's DNS, highly reliable for reachability check
            # Port 53 is DNS port
            socket.setdefaulttimeout(1.0)
            socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect(("8.8.8.8", 53))
            self._last_status = True
        except socket.error:
            self._last_status = False
        finally:
            self._last_check_time = current_time
            
        return self._last_status

# Singleton instance
_monitor = NetworkMonitor()

def network_available() -> bool:
    """
    Checks if the internet is available.
    Uses a 5-second cache to prevent spamming network probes.
    """
    return _monitor.is_available()
