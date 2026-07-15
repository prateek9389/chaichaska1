import sys

with open('app/admin/page.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Import getContactInfo, updateContactInfo
if 'getContactInfo' not in code:
    code = code.replace(
        'import { getOrders, updateOrder, getAddons, deleteAddon, addAddon, getSubscriptions, deleteSubscription } from "@/lib/firestore";',
        'import { getOrders, updateOrder, getAddons, deleteAddon, addAddon, getSubscriptions, deleteSubscription, getContactInfo, updateContactInfo } from "@/lib/firestore";'
    )
    # If the exact match above failed, we can use regex but let's assume it might have worked, if not, we can fall back to appending.
    if 'getContactInfo' not in code:
        code = code.replace(
            'from "@/lib/firestore";',
            ', getContactInfo, updateContactInfo } from "@/lib/firestore";'
        ).replace('}, getContactInfo', 'getContactInfo')

# 2. Add Sidebar Tab
if 'setActiveTab("contact")' not in code:
    sidebar_button = '''
              <button onClick={() => setActiveTab("contact")} className={`menu-icon-btn ${activeTab === "contact" ? "active" : ""}`}>
                <span className="btn-emoji">📞</span> Contact Info
              </button>
'''
    code = code.replace(
        '<button onClick={() => setActiveTab("subs")}',
        sidebar_button.strip() + '\n              <button onClick={() => setActiveTab("subs")}'
    )

# 3. Add Tab Body
if 'activeTab === "contact"' not in code:
    tab_body = '''
            {activeTab === "contact" && (() => {
              // Local state for the contact form
              const [localContact, setLocalContact] = useState({
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
              }, [contactLoaded]);

              return (
                <div className="tab-fade-in" style={{ padding: "30px", maxWidth: "800px", margin: "0 auto" }}>
                  <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#2c1b0d", margin: "0 0 20px" }}>Footer Contact Info</h1>
                  <p style={{ color: "#777", marginBottom: "30px" }}>Update the HQ Address, Phone, and Email shown in the website footer.</p>
                  
                  <div className="dashboard-card" style={{ padding: "30px", background: "#fff", borderRadius: "16px" }}>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Address Line 1</label>
                      <input 
                        type="text" 
                        value={localContact.address1} 
                        onChange={(e) => setLocalContact({...localContact, address1: e.target.value})} 
                        className="admin-input" 
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Address Line 2 (City, Zip)</label>
                      <input 
                        type="text" 
                        value={localContact.address2} 
                        onChange={(e) => setLocalContact({...localContact, address2: e.target.value})} 
                        className="admin-input" 
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Phone Number</label>
                      <input 
                        type="text" 
                        value={localContact.phone} 
                        onChange={(e) => setLocalContact({...localContact, phone: e.target.value})} 
                        className="admin-input" 
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "24px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Email Address</label>
                      <input 
                        type="text" 
                        value={localContact.email} 
                        onChange={(e) => setLocalContact({...localContact, email: e.target.value})} 
                        className="admin-input" 
                      />
                    </div>
                    
                    <button 
                      onClick={async () => {
                        setSaving(true);
                        try {
                          await updateContactInfo(localContact);
                          alert("Contact info updated successfully! (Refresh the page to see changes in the footer)");
                        } catch(e) {
                          alert("Error updating contact info");
                        }
                        setSaving(false);
                      }}
                      disabled={saving}
                      className="btn-primary" 
                      style={{ padding: "12px 24px", width: "100%", fontSize: "14px" }}
                    >
                      {saving ? "Saving..." : "Save Contact Info"}
                    </button>
                  </div>
                </div>
              );
            })()}
'''
    code = code.replace(
        '{activeTab === "subs" && (() => {',
        tab_body.strip() + '\n\n            {activeTab === "subs" && (() => {'
    )

with open('app/admin/page.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Contact settings added to admin page!")
