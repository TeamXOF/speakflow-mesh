import os
import shutil
import subprocess

src_dir = r"d:\[Project]\ReadSense"
dest_dir = r"d:\[Project]\SpeakFlow_Submission"

print(f"Preparing clean GitHub submission folder at: {dest_dir}")

# Remove if it exists to start perfectly fresh
if os.path.exists(dest_dir):
    shutil.rmtree(dest_dir)

# Folders and files we absolutely DO NOT want in the public GitHub repo
def ignore_patterns(dir, files):
    blocked = {
        '.git', 
        'node_modules', 
        '.next', 
        '__pycache__', 
        '.env', 
        '.vscode', 
        '.gemini',
        'ffmpeg.exe',
        'ffplay.exe',
        'ffprobe.exe'
    }
    return [f for f in files if f in blocked or f.endswith('.crdownload') or f.endswith('.mp3') or f.endswith('.m4a') or f.endswith('.mp4')]

# Copy everything over cleanly
shutil.copytree(src_dir, dest_dir, ignore=ignore_patterns)
print("Files copied successfully. No hidden caches, large binaries, or MP4 videos included.")

# Ensure no README or .gitignore exists to prevent GitHub conflicts
for file_to_remove in ['README.md', '.gitignore']:
    target_path = os.path.join(dest_dir, file_to_remove)
    if os.path.exists(target_path):
        os.remove(target_path)
        print(f"Deleted {file_to_remove} from submission folder.")

# Initialize Git
os.chdir(dest_dir)
print("Initializing fresh Git repository...")
subprocess.run(["git", "init"], check=True)

print("Adding files to Git...")
subprocess.run(["git", "add", "."], check=True)

print("Committing inside the 1-hour Hackathon window...")
subprocess.run(["git", "commit", "-m", "Initial commit for Gemma 3N Hackathon"], check=True)

print("\nALL DONE! Your fresh repository is ready at:")
print(dest_dir)
