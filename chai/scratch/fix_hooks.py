import sys

with open('app/admin/page.js', 'r', encoding='utf-8') as f:
    code = f.read()

hooks_block = """
  // Local state for the contact form
  const [localContact, setLocalContact] = useState({
    brandName: "ChaiCo.",
    brandDesc: "Freshly brewed spice teas and organic loose blends sourced straight from certified tea farms. Delivered hot and fresh.",
    address1: "102 Tea Estate lane, Assam Garden,",
    address2: "India 781001",
    phone: "+91 98765 43210",
    email: "hello@chaico.com"
  });
  const [contactLoaded, setContactLoaded] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    if (!contactLoaded) {
      getContactInfo().then(data => {
        setLocalContact(data);
        setContactLoaded(true);
      });
    }
  }, [contactLoaded]);
"""

# Insert hooks at the top level
if 'const [localContact' not in code[:20000]: # check top of file
    target = '// Inline stock edit state'
    code = code.replace(target, hooks_block.strip() + '\n\n  ' + target)

# Remove hooks from inside the conditional render
to_remove = """              // Local state for the contact form
              const [localContact, setLocalContact] = useState({
                brandName: "ChaiCo.",
                brandDesc: "Freshly brewed spice teas and organic loose blends sourced straight from certified tea farms. Delivered hot and fresh.",
                address1: "102 Tea Estate lane, Assam Garden,",
                address2: "India 781001",
                phone: "+91 98765 43210",
                email: "hello@chaico.com"
              });
              const [contactLoaded, setContactLoaded] = useState(false);
              const [saving, setSaving] = useState(false);

              useEffect(() => {
                if (!contactLoaded) {
                  getContactInfo().then(data => {
                    setLocalContact(data);
                    setContactLoaded(true);
                  });
                }
              }, [contactLoaded]);"""

code = code.replace(to_remove, '')
code = code.replace('setSaving(true)', 'setSavingContact(true)')
code = code.replace('setSaving(false)', 'setSavingContact(false)')
code = code.replace('disabled={saving}', 'disabled={savingContact}')
code = code.replace('{saving ? "Saving..."', '{savingContact ? "Saving..."')

with open('app/admin/page.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Hooks moved to top level")
