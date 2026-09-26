import re

with open('app/admin-chaichaska-login/page.js', 'r', encoding='utf-8') as f:
    c = f.read()

# The function to find and deduplicate
func_pattern = r"const handleDownloadCSV = \(\) => \{[\s\S]*?document\.body\.removeChild\(link\);\s*\};"

# Find all occurrences
matches = re.findall(func_pattern, c)

if len(matches) > 1:
    print(f"Found {len(matches)} occurrences. Deduplicating...")
    # Replace all occurrences with empty string, then add one back at the location of the first match
    first_match_index = c.find(matches[0])
    
    # Remove all
    c = re.sub(func_pattern, "", c)
    
    # Insert one back
    # But wait, inserting via index is risky if lengths changed. 
    pass

# Better approach: Just replace the pattern but keep the first one
def deduplicate(match, state={"count": 0}):
    state["count"] += 1
    if state["count"] == 1:
        return match.group(0)
    return ""

c = re.sub(func_pattern, deduplicate, c)

# Clean up any multiple blank lines created by removal
c = re.sub(r'\n\s*\n\s*\n', '\n\n', c)

with open('app/admin-chaichaska-login/page.js', 'w', encoding='utf-8') as f:
    f.write(c)
    
print("Deduplicated in admin page.")

# Let's also check brewmaster just in case
with open('app/brewmaster-chaichaska-login/page.js', 'r', encoding='utf-8') as f:
    cb = f.read()

def deduplicate_brew(match, state={"count": 0}):
    state["count"] += 1
    if state["count"] == 1:
        return match.group(0)
    return ""

cb = re.sub(func_pattern, deduplicate_brew, cb)
cb = re.sub(r'\n\s*\n\s*\n', '\n\n', cb)

with open('app/brewmaster-chaichaska-login/page.js', 'w', encoding='utf-8') as f:
    f.write(cb)
    
print("Deduplicated in brewmaster page.")
