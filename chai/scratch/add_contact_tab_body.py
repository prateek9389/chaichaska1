import sys

with open('app/admin/page.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 3. Add Tab Body
if 'setLocalContact' not in code:
    tab_body = '''
            {activeTab === "contact" && (() => {
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
                  <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#2c1b0d", margin: "0 0 20px" }}>Footer Settings</h1>
                  <p style={{ color: "#777", marginBottom: "30px" }}>Update the branding and contact details shown in the website footer.</p>
                  
                  <div className="dashboard-card" style={{ padding: "30px", background: "#fff", borderRadius: "16px" }}>
                    
                    <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>Brand Details</h3>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Brand Name</label>
                      <input 
                        type="text" 
                        value={localContact.brandName || ""} 
                        onChange={(e) => setLocalContact({...localContact, brandName: e.target.value})} 
                        className="admin-input" 
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "24px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Brand Description</label>
                      <textarea 
                        rows="3"
                        value={localContact.brandDesc || ""} 
                        onChange={(e) => setLocalContact({...localContact, brandDesc: e.target.value})} 
                        className="admin-input" 
                        style={{ resize: "none" }}
                      />
                    </div>

                    <h3 style={{ fontSize: "16px", marginBottom: "16px", marginTop: "32px", borderTop: "1px solid #eee", paddingTop: "24px" }}>Contact Details</h3>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Address Line 1</label>
                      <input 
                        type="text" 
                        value={localContact.address1 || ""} 
                        onChange={(e) => setLocalContact({...localContact, address1: e.target.value})} 
                        className="admin-input" 
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Address Line 2 (City, Zip)</label>
                      <input 
                        type="text" 
                        value={localContact.address2 || ""} 
                        onChange={(e) => setLocalContact({...localContact, address2: e.target.value})} 
                        className="admin-input" 
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Phone Number</label>
                      <input 
                        type="text" 
                        value={localContact.phone || ""} 
                        onChange={(e) => setLocalContact({...localContact, phone: e.target.value})} 
                        className="admin-input" 
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "24px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Email Address</label>
                      <input 
                        type="text" 
                        value={localContact.email || ""} 
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
                      {saving ? "Saving..." : "Save Footer Settings"}
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

print("Contact settings body added to admin page!")
