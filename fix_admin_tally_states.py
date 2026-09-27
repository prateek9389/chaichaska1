target_file = r'c:\Users\HP\Desktop\chai update\chaichaska1\app\admin-chaichaska-login\page.js'
dest_file = r'c:\Users\HP\Desktop\chai\chaichaska1\app\admin-chaichaska-login\page.js'

with open(target_file, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Remove from lower position (lines 663-666)
lower_block = '''  const [showTodayStatsSidebar, setShowTodayStatsSidebar] = useState(false);
  const [tallyDateFilter, setTallyDateFilter] = useState("today");
  const [customTallyDate, setCustomTallyDate] = useState(new Date().toISOString().split('T')[0]);
  const [tallySearchTerm, setTallySearchTerm] = useState("");'''

if lower_block in code:
    code = code.replace(lower_block, '', 1)
    print("Removed from lower position.")
else:
    print("Lower block not found directly, checking variations.")

# 2. Add to upper position (right after pendingSearchTerm)
upper_target = '  const [pendingSearchTerm, setPendingSearchTerm] = useState("");'
upper_replacement = '''  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [showTodayStatsSidebar, setShowTodayStatsSidebar] = useState(false);
  const [tallyDateFilter, setTallyDateFilter] = useState("today");
  const [customTallyDate, setCustomTallyDate] = useState(new Date().toISOString().split('T')[0]);
  const [tallySearchTerm, setTallySearchTerm] = useState("");'''

if upper_target in code and 'const [tallyDateFilter, setTallyDateFilter]' not in code[:10000]:
    code = code.replace(upper_target, upper_replacement, 1)
    print("Added to upper position.")

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(code)

with open(dest_file, 'w', encoding='utf-8') as f:
    f.write(code)

print("Both admin page files updated successfully!")
