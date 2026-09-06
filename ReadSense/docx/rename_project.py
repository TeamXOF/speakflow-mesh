import os

directory = r"d:\[Project]\SpeakFlow"
exclude_dirs = ['node_modules', '.git', '.next', '__pycache__']
extensions = ['.ts', '.tsx', '.py', '.md', '.bat', '.json', '.html', '.css']

def replace_terms(text):
    return text.replace('SpeakFlow', 'SpeakFlow').replace('speakflow', 'speakflow').replace('SPEAKFLOW', 'SPEAKFLOW')

files_to_rename = []

for root, dirs, files in os.walk(directory):
    # Exclude directories
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    
    for file in files:
        if any(file.endswith(ext) for ext in extensions):
            filepath = os.path.join(root, file)
            
            # Read and replace content
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = replace_terms(content)
                
                if new_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated content in: {filepath}")
            except Exception as e:
                print(f"Could not read/write {filepath}: {e}")
                
            # Queue for renaming if necessary
            if 'SpeakFlow' in file or 'speakflow' in file or 'SPEAKFLOW' in file:
                files_to_rename.append(filepath)

# Rename files
for filepath in files_to_rename:
    directory_name = os.path.dirname(filepath)
    old_filename = os.path.basename(filepath)
    new_filename = replace_terms(old_filename)
    new_filepath = os.path.join(directory_name, new_filename)
    
    try:
        os.rename(filepath, new_filepath)
        print(f"Renamed: {old_filename} -> {new_filename}")
    except Exception as e:
        print(f"Could not rename {filepath}: {e}")
