import sys

with open('app/admin/page.js', 'r', encoding='utf-8') as f:
    code = f.read()

start_marker = '          {activeTab === "addons" && ('
end_marker = '            </div>\n          )}'

start_idx = code.find(start_marker)
if start_idx == -1:
    print("Could not find start of addons block")
    sys.exit(1)

# Find the matching end_marker
# We know the addons block ends at line 2901 (approximately 100 lines).
# Let's just find the next end_marker after start_idx
end_idx = code.find(end_marker, start_idx) + len(end_marker)

addons_block = code[start_idx:end_idx]

# Remove the block from its current location
code = code[:start_idx] + code[end_idx:]

# Find where to insert it: before `{activeTab === "subs" && (() => {`
insert_marker = '{activeTab === "subs" && (() => {'
insert_idx = code.find(insert_marker)
if insert_idx == -1:
    print("Could not find subs block")
    sys.exit(1)

# Insert the addons block
code = code[:insert_idx] + addons_block + "\n\n            " + code[insert_idx:]

with open('app/admin/page.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Successfully moved addons block!")
