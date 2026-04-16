#!/usr/bin/env python3
"""
Fix hardcoded URLs in Frontend TSX files
"""
import os
import re
from pathlib import Path

# Define replacements mapping
ENDPOINT_REPLACEMENTS = {
    # Auth endpoints
    r"'http://72\.62\.71\.97:35000/api/auth/login'": "API_ENDPOINTS.LOGIN",
    r'"http://72\.62\.71\.97:35000/api/auth/login"': "API_ENDPOINTS.LOGIN",
    r"`http://72\.62\.71\.97:35000/api/auth/login`": "API_ENDPOINTS.LOGIN",
    r"'http://72\.62\.71\.97:35000/api/auth/register'": "API_ENDPOINTS.REGISTER",
    r'"http://72\.62\.71\.97:35000/api/auth/register"': "API_ENDPOINTS.REGISTER",
    r"`http://72\.62\.71\.97:35000/api/auth/register`": "API_ENDPOINTS.REGISTER",
    r"'http://72\.62\.71\.97:35000/api/auth/profile'": "API_ENDPOINTS.PROFILE",
    r'"http://72\.62\.71\.97:35000/api/auth/profile"': "API_ENDPOINTS.PROFILE",
    r"`http://72\.62\.71\.97:35000/api/auth/profile`": "API_ENDPOINTS.PROFILE",
    r"'http://72\.62\.71\.97:35000/api/auth/users'": "API_ENDPOINTS.USERS",
    r'"http://72\.62\.71\.97:35000/api/auth/users"': "API_ENDPOINTS.USERS",
    
    # Trees endpoints - simple list
    r"'http://72\.62\.71\.97:35000/api/trees'": "API_ENDPOINTS.TREES_LIST",
    r'"http://72\.62\.71\.97:35000/api/trees"': "API_ENDPOINTS.TREES_LIST",
    
    # Trees - bulk import
    r"'http://72\.62\.71\.97:35000/api/trees/bulk'": "API_ENDPOINTS.TREES_BULK_IMPORT",
    r'"http://72\.62\.71\.97:35000/api/trees/bulk"': "API_ENDPOINTS.TREES_BULK_IMPORT",
    
    # Trees - reassign
    r"'http://72\.62\.71\.97:35000/api/trees/reassign'": "API_ENDPOINTS.TREES_REASSIGN",
    r'"http://72\.62\.71\.97:35000/api/trees/reassign"': "API_ENDPOINTS.TREES_REASSIGN",
    
    # Trees - with ID patterns (need special handling)
    r"`http://72\.62\.71\.97:35000/api/trees/\$\{treeId\}`": "`${API_ENDPOINTS.ANALYSIS_BY_TREE(treeId)}`",
    r"`http://72\.62\.71\.97:35000/api/trees/\$\{id\}`": "`${BACKEND_API.TREES}/${id}`",
    
    # Analysis endpoints
    r"'http://72\.62\.71\.97:35000/api/analysis'": "API_ENDPOINTS.ANALYSIS_CREATE",
    r'"http://72\.62\.71\.97:35000/api/analysis"': "API_ENDPOINTS.ANALYSIS_CREATE",
    r"`http://72\.62\.71\.97:35000/api/analysis`": "API_ENDPOINTS.ANALYSIS_CREATE",
    
    # Analysis - history
    r"`http://72\.62\.71\.97:35000/api/analysis/history.*`": "`${API_ENDPOINTS.ANALYSIS_HISTORY}?${queryParams.toString()}`",
    
    # Analysis - tree
    r"`http://72\.62\.71\.97:35000/api/analysis/tree/\$\{treeId\}`": "`${API_ENDPOINTS.ANALYSIS_BY_TREE(treeId)}`",
    
    # Dashboard
    r"'http://72\.62\.71\.97:35000/api/dashboard'": "API_ENDPOINTS.DASHBOARD",
    r'"http://72\.62\.71\.97:35000/api/dashboard"': "API_ENDPOINTS.DASHBOARD",
    r"`http://72\.62\.71\.97:35000/api/dashboard`": "API_ENDPOINTS.DASHBOARD",
    
    # Import
    r"'http://72\.62\.71\.97:35000/api/import/trees'": "API_ENDPOINTS.TREES_BULK_IMPORT",
    r'"http://72\.62\.71\.97:35000/api/import/trees"': "API_ENDPOINTS.TREES_BULK_IMPORT",
    r"`http://72\.62\.71\.97:35000/api/import/trees`": "API_ENDPOINTS.TREES_BULK_IMPORT",
}

def has_api_config_import(content):
    """Check if file has API config import"""
    return "API_ENDPOINTS" in content and ("from '../config" in content or "import {" in content and "API_ENDPOINTS" in content)

def add_api_config_import(content):
    """Add API_ENDPOINTS import if not present"""
    if "import { API_ENDPOINTS }" in content:
        return content
    
    # Find the last import statement
    import_pattern = r"(import\s+.*?from\s+['\"].*?['\"];?\n)"
    matches = list(re.finditer(import_pattern, content))
    
    if matches:
        last_import = matches[-1]
        insert_pos = last_import.end()
        new_import = "import { API_ENDPOINTS } from '../config/apiConfig';\n"
        return content[:insert_pos] + new_import + content[insert_pos:]
    
    return content

def fix_file(filepath):
    """Fix hardcoded URLs in a file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    made_changes = False
    
    # Check if file needs fixing
    if "72.62.71.97" not in content:
        return False
    
    # Add import if needed and has replacements
    if not has_api_config_import(content) and "72.62.71.97" in content:
        content = add_api_config_import(content)
        made_changes = True
    
    # Apply replacements
    for pattern, replacement in ENDPOINT_REPLACEMENTS.items():
        if re.search(pattern, content):
            content = re.sub(pattern, replacement, content)
            made_changes = True
    
    # Write back if changed
    if made_changes and content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    
    return False

def main():
    frontend_src = Path("c:/Users/pc/Downloads/Soliferme_app/Frontend/src")
    
    fixed_count = 0
    for tsx_file in frontend_src.rglob("*.tsx"):
        if "node_modules" not in str(tsx_file):
            try:
                if fix_file(str(tsx_file)):
                    print(f"✓ Fixed: {tsx_file.relative_to(frontend_src)}")
                    fixed_count += 1
            except Exception as e:
                print(f"✗ Error fixing {tsx_file}: {e}")
    
    print(f"\nFixed {fixed_count} files")

if __name__ == "__main__":
    main()
