#!/usr/bin/env python3
"""Add API_ENDPOINTS import to TSX files that use it"""
import re
from pathlib import Path

def add_api_endpoints_import(content):
    """Add API_ENDPOINTS import if file uses it but lacks the import"""
    if not "API_ENDPOINTS." in content:
        return content, False
    
    if "import { API_ENDPOINTS }" in content or "from '../config/apiConfig'" in content:
        return content, False
    
    # Find the position to insert import - after existing imports but could also handle different import patterns
    # Look for pattern: import ... from '...';\n
    import_pattern = r"(import\s+(?:\{[^}]*\}|[^;]*?)\s+from\s+['\"][^'\"]*['\"];?\n)+(?=\n|\S)"
    
    match = re.search(import_pattern, content)
    if match:
        insert_pos = match.end()
        new_import = "import { API_ENDPOINTS } from '../config/apiConfig';\n"
        return content[:insert_pos] + new_import + content[insert_pos:], True
    
    # Fallback: just find any import line and insert after the last one
    lines = content.split('\n')
    last_import_idx = -1
    for i, line in enumerate(lines):
        if re.match(r"^import\s+", line) and "from" in line:
            last_import_idx = i
    
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, "import { API_ENDPOINTS } from '../config/apiConfig';")
        return '\n'.join(lines), True
    
    return content, False

def main():
    frontend_src = Path("c:/Users/pc/Downloads/Soliferme_app/Frontend/src")
    fixed_count = 0
    
    for tsx_file in frontend_src.rglob("*.tsx"):
        if "node_modules" in str(tsx_file):
            continue
        
        try:
            with open(tsx_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content, changed = add_api_endpoints_import(content)
            
            if changed:
                with open(tsx_file, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"✓ Added import to: {tsx_file.relative_to(frontend_src)}")
                fixed_count += 1
        except Exception as e:
            print(f"✗ Error processing {tsx_file}: {e}")
    
    print(f"\nAdded imports to {fixed_count} files")

if __name__ == "__main__":
    main()
