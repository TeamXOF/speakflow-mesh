import os
import subprocess

def kill_port(port):
    try:
        output = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True).decode()
        for line in output.split('\n'):
            if 'LISTENING' in line:
                pid = line.strip().split()[-1]
                print(f"Killing PID {pid}")
                os.system(f"taskkill /F /PID {pid}")
    except Exception as e:
        print(f"Error or not found: {e}")

if __name__ == '__main__':
    kill_port(8000)
