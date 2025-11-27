import subprocess
import sys
from pathlib import Path

try:
    import nbformat
    from nbconvert.preprocessors import ExecutePreprocessor
except ImportError:
    print(" Installing nbconvert...")
    subprocess.run([sys.executable, "-m", "pip", "install", "nbconvert", "nbformat"])
    import nbformat
    from nbconvert.preprocessors import ExecutePreprocessor

current_dir = Path.cwd()

def run_script(script_name):
    print(f"Running {script_name}...")
    result = subprocess.run([sys.executable, script_name], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ {script_name} failed!")
        print(result.stderr)
        sys.exit(1)
    
    print(f" {script_name} completed!")

def run_notebook(notebook_path):
    """Run a Jupyter notebook (.ipynb) programmatically"""
    print(f"Running notebook {notebook_path}...")
    
    cmd = [
        sys.executable, "-m", "nbconvert",
        "--to", "notebook",
        "--execute",
        "--inplace",
        str(notebook_path)
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ {notebook_path} failed!")
        print(result.stderr)
        sys.exit(1)
    
    print(f" {notebook_path} completed!")

if __name__ == "__main__":
    try:
        run_script("scraper.py")
        run_notebook(current_dir / "data_handling" / "data_clean.ipynb")
        run_notebook(current_dir / "data_handling" / "prediction.ipynb")
        print(" Pipeline completed!")
    except Exception as e:
        print(f"❌ Pipeline failed: {e}")
        sys.exit(1)