  const [orders, setOrders] = useState([
    {
      id: "#10234",
      customer: "John Bike Parts",
      date: "09/12/2026",
      status: "Shipped",
      total: "Γé╣1,200",
      item: "Classic Masala Chai x8",
      office: "Suite 302, Building A",
      sugar: "Normal Sugar",
      milk: "Whole Milk",
      img: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
      priority: "Normal",
      createdAt: Date.now() - 3600000, // 1 hour ago
      allocatedTime: "30 mins",
    },
    {
      id: "#10235",
      customer: "Elite Cycling Co.",
      date: "09/11/2026",
      status: "Pending",
      total: "Γé╣3,600",
      item: "Saffron Royal Chai x12",
      office: "Floor 4, Conference Room B",
      sugar: "Mild Sugar",
      milk: "Oat Milk",
      img: "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg",
      priority: "High",
      createdAt: Date.now() - 1800000, // 30 mins ago
      allocatedTime: "40 mins",
    },
    {
      id: "#10236",
      customer: "SpeedWheels",
      date: "09/10/2026",
      status: "Delivered",
      total: "Γé╣2,800",
      item: "Ginger Chai x10",
      office: "Cabin 12, Floor 5",
      sugar: "No Sugar",
      milk: "Almond Milk",
      img: "https://i.pinimg.com/736x/95/d1/9a/95d19a7cad652dd1caceb091c9794ac9.jpg",
      priority: "Normal",
      createdAt: Date.now() - 7200000, // 2 hours ago
      allocatedTime: "35 mins",
    },
    {
      id: "#10239",
      customer: "Vikram R.",
      date: "09/12/2026",
      status: "Received",
      total: "Γé╣380",
      item: "Kashmiri Kahwa x2",
      office: "Office 402, Block B",
      sugar: "Normal Sweet",
      milk: "Black Chai",
      img: "https://i.pinimg.com/736x/c4/a8/cc/c4a8ccde9a67e5f24e2be4d0621f4186.jpg",
      priority: "High",
      createdAt: Date.now() - 480000, // 8 mins ago
      allocatedTime: "",
    },
    {
      id: "#10240",
      customer: "Sneha K.",
      date: "09/12/2026",
      status: "Received",
      total: "Γé╣169",
      item: "Ginger (Adrak) Chai x1",
      office: "Office 105, Ground Floor",
      sugar: "No Sugar",
      milk: "Almond Milk",
      img: "/chai-ingredients.png",
      priority: "Normal",
      createdAt: Date.now() - 120000, // 2 mins ago
      allocatedTime: "",
    },
  ]);
  const todayTally = {
    "Masala Chai": 24,
    "Cardamom Chai": 18,
    "Ginger Chai": 15,
    "Saffron Royal Chai": 9,
    "Almond Cookies": 30,
  };

  const floorBatches = [
    { floor: "Floor 5", items: "5x Masala Chai, 2x Cookies", status: "High Demand" },
    { floor: "Floor 3", items: "3x Ginger Chai, 4x Cookies", status: "Medium Demand" },
  ];
  const [stocks, setStocks] = useState([
    { name: "Assam Loose Tea Leaves", qty: "45 Kg Remaining", level: "In Stock", unitPrice: 350, unit: "Kg", supplier: "Jaipur Spices Ltd (+91 99999 11111)" },
    { name: "Fresh Ginger Roots", qty: "12 Kg Remaining", level: "Low Stock", unitPrice: 120, unit: "Kg", supplier: "Alwar Organic Farms (+91 88888 22222)" },
    { name: "Green Cardamom Elaichi Pods", qty: "2.5 Kg Remaining", level: "Low Stock", unitPrice: 1800, unit: "Kg", supplier: "Kerala Plantation Direct (+91 77777 33333)" },
    { name: "Organic Kashmiri Saffron", qty: "80 Grams Remaining", level: "Low Stock", unitPrice: 280, unit: "Grams", supplier: "Pampore Saffron Valley (+91 66666 44444)" },
    { name: "Whole Milk Cartons", qty: "5 Ltrs Remaining", level: "Out of Stock", unitPrice: 65, unit: "Ltrs", supplier: "Jaipur Dairy Co-op (+91 55555 55555)" },
  ]);
  const [restockHistory, setRestockHistory] = useState([
    { date: "02/07/2026", item: "Assam Loose Tea Leaves", qty: "20 Kg", source: "Jaipur Spices Ltd" },
    { date: "30/06/2026", item: "Whole Milk Cartons", qty: "50 Ltrs", source: "Jaipur Dairy Co-op" },
  ]);

  // Restock alerts/requests states
  const [restockRequests, setRestockRequests] = useState([
    { item: "Green Cardamom Elaichi Pods", qty: "10 Kg", urgency: "High", notes: "Almost out of Elaichi base", date: "Just now", status: "Sent to Admin" }
  ]);
  const customerManagement = [
    { name: "John Bike Parts", orders: 10, value: "Γé╣12,000", lastOrder: "09/12/2026", loyalty: "Gold" },
    { name: "Elite Cycling Co.", orders: 15, value: "Γé╣25,000", lastOrder: "09/11/2026", loyalty: "Platinum" },
  ];

  // Earnings Summary Stats
  const statsSummary = {
    totalSales: "Γé╣125,000",
    totalOrders: "450 orders",
    deliveryShipment: "560 Delivery",
    pendingShipment: "25 orders",
    avgOrderValue: "Γé╣278/Order",
  };

  const todaySettlements = [
    { item: "Classic Masala Chai (24 units)", value: "Γé╣3,576" },
    { item: "Saffron Royal Chai (9 units)", value: "Γé╣2,241" },
    { item: "Ginger (Adrak) Chai (15 units)", value: "Γé╣2,535" },
    { item: "Almond Cookies (30 units)", value: "Γé╣1,500" },
  ];

  const historyOrders = [
    { id: "#10230", customer: "Aarav Mehta", status: "Delivered", date: "09/12/2026 11:20 AM", total: "Γé╣298", items: "2x Classic Masala Chai", customization: "Oat Milk, Low Sugar", office: "Office 402, Floor 4" },
    { id: "#10231", customer: "Priya Patel", status: "Delivered", date: "09/12/2026 10:45 AM", total: "Γé╣450", items: "1x Saffron Royal Chai, 2x Ginger Chai", customization: "Mild Sugar, Cardamom", office: "Office 512, Floor 5" },
    { id: "#10232", customer: "Rohan Sharma", status: "Cancelled", date: "09/11/2026 04:15 PM", total: "Γé╣169", items: "1x Ginger (Adrak) Chai", customization: "No Sugar", office: "Office 301, Floor 3" },
    { id: "#10233", customer: "Karan Johar", status: "Delivered", date: "09/11/2026 02:30 PM", total: "Γé╣596", items: "2x Kashmiri Kahwa, 1x Saffron Royal Chai", customization: "Whole Milk, High Sweetness", office: "Office 508, Floor 5" },
  ];

  // Menu items
  const [menuItems, setMenuItems] = useState([
    {
      name: "Classic Masala Chai",
      price: 149,
      active: true,
      image: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
      desc: "Our signature blend brewed with freshly ground whole spices.",
      category: "Chai",
      unit: "Kulhad",
      veg: true,
      prepTime: "8 mins",
      minQty: 1,
      maxQty: 12,
      isSpecial: true,
      approvalStatus: "Approved",
      scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      timeSlot: "All Day",
      linkedIngredients: ["Assam Loose Tea Leaves"]
    },
    {
      name: "Ginger (Adrak) Chai",
      price: 169,
      active: true,
      image: "/chai-ingredients.png",
      desc: "Warm and soothing brew infusing robust Assam CTC with grated farm ginger.",
      category: "Chai",
      unit: "Cup",
      veg: true,
      prepTime: "6 mins",
      minQty: 1,
      maxQty: 10,
      isSpecial: false,
      approvalStatus: "Approved",
      scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      timeSlot: "All Day",
      linkedIngredients: ["Fresh Ginger Roots"]
    },
    {
      name: "Saffron Royal Chai",
      price: 249,
      active: true,
      image: "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg",
      desc: "Fragrant luxury Kashmiri saffron strands infused with sweet milk.",
      category: "Chai",
      unit: "Kulhad",
      veg: true,
      prepTime: "12 mins",
      minQty: 1,
      maxQty: 6,
      isSpecial: false,
      linkedIngredients: ["Organic Kashmiri Saffron"],
      approvalStatus: "Approved",
      scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      timeSlot: "Evening Only"
    },
  ]);

  const [menuSubTab, setMenuSubTab] = useState("live");
  const [combos, setCombos] = useState([
    { name: "Evening Rush Combo", items: "Classic Masala Chai + Almond Cookies", price: 199, active: true, desc: "A perfect hot masala brew paired with 2 crisp almond cookies." },
    { name: "Kesar Winter Booster", items: "Saffron Royal Chai + Saffron Biscuits", price: 299, active: true, desc: "Luxury Saffron tea served with premium custom saffron-dipped biscuits." }
  ]);

  const [addonsList, setAddonsList] = useState([
    { name: "Almond Cookies", price: 50, image: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg", desc: "Crisp biscuits baked with almond flakes.", active: true },
    { name: "Almond Slivers Add-on", price: 30, image: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg", desc: "Toasted sliced almonds to sprinkle.", active: true },
    { name: "Fresh Mint Leaves", price: 10, image: "/chai-ingredients.png", desc: "Hand-picked cooling mint leaves.", active: true }
  ]);

  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState("");
  const [newAddonImg, setNewAddonImg] = useState("");
  const [newAddonDesc, setNewAddonDesc] = useState("");
  const [selectedComboAddons, setSelectedComboAddons] = useState([]);

  const [newMenuItemName, setNewMenuItemName] = useState("");
  const [newMenuItemPrice, setNewMenuItemPrice] = useState("");
  const [newMenuItemImg, setNewMenuItemImg] = useState("");
  const [newMenuItemDesc, setNewMenuItemDesc] = useState("");
  
  const [newMenuCategory, setNewMenuCategory] = useState("Chai");
  const [newMenuUnit, setNewMenuUnit] = useState("Cup");
  const [newMenuPrepTime, setNewMenuPrepTime] = useState("8 mins");
  const [newMenuMinQty, setNewMenuMinQty] = useState(1);
  const [newMenuMaxQty, setNewMenuMaxQty] = useState(10);
  const [newMenuVeg, setNewMenuVeg] = useState(true);
  const [historyViewMode, setHistoryViewMode] = useState("grid");
  const [historyDateFilter, setHistoryDateFilter] = useState("all");
  const [activeInvoice, setActiveInvoice] = useState(null);

  // Subscriptions Due
  const upcomingSubscriptions = [
    { customer: "Rohan V.", floor: "Floor 4", time: "09:00 AM", items: "1x Masala Chai (Daily)" },
    { customer: "Meera J.", floor: "Floor 5", time: "11:30 AM", items: "1x Ginger Chai (Weekly)" },
  ];

  // Feedback list
  const [feedbackList, setFeedbackList] = useState([
    { orderId: "ORD-8102", customer: "Rohan V.", rating: 5, date: "09/12/2026", text: "Absolutely loved the warm cardamom notes! Perfectly balanced sweetness." },
    { orderId: "ORD-8101", customer: "Priya P.", rating: 4, date: "09/12/2026", text: "The saffron aroma is premium, but the milk was slightly thick today. Good effort!" },
    { orderId: "ORD-8098", customer: "Karan J.", rating: 5, date: "09/11/2026", text: "Kashmiri Kahwa is a lifesaver in these airconditioned office rooms." }
  ]);

  // Settings & Working Hours
  const [leaveStart, setLeaveStart] = useState("2026-07-10");
  const [leaveEnd, setLeaveEnd] = useState("2026-07-12");
  const [newLeaveReason, setNewLeaveReason] = useState("");
  const [leaveRequests, setLeaveRequests] = useState([
    { start: "2026-07-10", end: "2026-07-12", reason: "Family Event", status: "Approved" }
  ]);
  const [workingHours, setWorkingHours] = useState("8:00 AM - 6:00 PM");
  const [shopName, setShopName] = useState("ChaiCo Jaipur HQ");
  const [brewmasterName, setBrewmasterName] = useState("Chef Kanti Lal");
  const [brewmasterContact, setBrewmasterContact] = useState("+91 98765 43210");
  const [brewmasterBio, setBrewmasterBio] = useState("Specialist in traditional spice infusions, kulhad brewing, and custom spice blends with 6+ years of corporate hospitality experience.");

  // Realtime Incoming Alert states
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const audioIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const [timeTick, setTimeTick] = useState(0);

  useEffect(() => {
    const savedLogin = localStorage.getItem("brewmaster_logged");
    if (savedLogin === "true") {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const allocateTime = (id, timeVal) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, allocatedTime: timeVal } : o))
    );
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (username === "brewmaster" && password === "chai") {
      setIsLoggedIn(true);
      localStorage.setItem("brewmaster_logged", "true");
      setLoginError("");
    } else {
      setLoginError("Invalid credentials. Hint: brewmaster / chai");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("brewmaster_logged");
  };

  const playAlarmTone = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1020, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (err) {}
  };

  const startAlertRinging = () => {
    if (audioIntervalRef.current) return;
    playAlarmTone();
    audioIntervalRef.current = setInterval(playAlarmTone, 750);
  };

  const stopAlertRinging = () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const triggerMockOrderAlert = () => {
    const mockOrderObj = {
      id: `#1024${Math.floor(1 + Math.random() * 9)}`,
      item: "Kesar Saffron Royal Chai x2",
      customer: "Amit Sharma",
      office: "Office 305, Block C",
      sugar: "Mild Sugar",
      milk: "Organic Oat Milk",
      price: "Γé╣498",
      img: "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg",
    };
    setIncomingOrder(mockOrderObj);
    setCountdown(60);
    startAlertRinging();

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          stopAlertRinging();
          setIncomingOrder(null);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const acceptOrderAlert = () => {
    stopAlertRinging();
    if (incomingOrder) {
      setOrders((prev) => [
        ...prev,
        {
          id: incomingOrder.id,
          customer: incomingOrder.customer,
          date: "Just now",
          status: "Received",
          total: incomingOrder.price,
          item: incomingOrder.item,
          office: incomingOrder.office,
          sugar: incomingOrder.sugar,
          milk: incomingOrder.milk,
          img: incomingOrder.img,
        },
      ]);
    }
    setIncomingOrder(null);
  };

  const rejectOrderAlert = () => {
    stopAlertRinging();
    setIncomingOrder(null);
  };

  const acceptSpecificOrder = (id) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "Pending" } : o))
    );
  };

  const rejectSpecificOrder = (id) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "Cancelled" } : o))
    );
  };

  const handleRaiseAlert = (e) => {
    e.preventDefault();
    if (!requestQty) return;
    const newReq = {
      item: selectedItem,
      qty: requestQty,
      urgency: urgency,
      notes: requestNotes || "No notes",
      date: "Just now",
      status: "Sent to Admin"
    };
    setRestockRequests((prev) => [newReq, ...prev]);
    setToastMsg(`≡ƒÜ¿ Restock alert for "${selectedItem}" has been sent to the Admin!`);
    setRequestQty("");
    setRequestNotes("");
    setTimeout(() => setToastMsg(""), 4500);
  };

  const handleToggleMenuAvailability = (idx) => {
    setMenuItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, active: !item.active } : item))
    );
    setToastMsg(`Updated menu item availability!`);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleAddNewMenuItem = (e) => {
    e.preventDefault();
    if (!newMenuItemName || !newMenuItemPrice) return;
    const newItem = {
      name: newMenuItemName,
      price: parseFloat(newMenuItemPrice) || 0,
      active: true,
      image: newMenuItemImg || "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
      desc: newMenuItemDesc || "Freshly prepared beverages by Brewmaster.",
      category: newMenuCategory,
      unit: newMenuUnit,
      veg: newMenuVeg,
      prepTime: newMenuPrepTime,
      minQty: parseInt(newMenuMinQty) || 1,
      maxQty: parseInt(newMenuMaxQty) || 10,
      isSpecial: false,
      approvalStatus: "Approved",
      scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      timeSlot: "All Day",
      linkedIngredients: []
    };
    setMenuItems((prev) => [...prev, newItem]);
    setToastMsg(`≡ƒî▒ Added "${newMenuItemName}" to today's menu!`);
    setNewMenuItemName("");
    setNewMenuItemPrice("");
    setNewMenuItemImg("");
    setNewMenuItemDesc("");
    setTimeout(() => setToastMsg(""), 4000);
  };

  const handleAddNewStock = (e) => {
    e.preventDefault();
    if (!newStockName || !newStockQty) return;
    const newItem = {
      name: newStockName,
      qty: newStockQty,
      level: newStockLevel,
      unitPrice: 150,
      unit: newStockQty.split(" ")[1] || "Kg",
      supplier: "Default Vendor (+91 99999 00000)"
    };
    setStocks((prev) => [...prev, newItem]);
    setToastMsg(`≡ƒî▒ Successfully added "${newStockName}" to Kitchen Stock!`);
    setNewStockName("");
    setNewStockQty("");
    setTimeout(() => setToastMsg(""), 4000);
  };

  const handleSaveStockEdit = (idx) => {
    setStocks((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, qty: editStockQty, level: editStockLevel } : s))
    );
    setEditingStockIdx(null);
    setToastMsg(`Γ£ô Updated stock details successfully!`);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const toggleStockStatus = (idx, level) => {
    const nextLevels = { "In Stock": "Low Stock", "Low Stock": "Out of Stock", "Out of Stock": "In Stock" };
    const nextLvl = nextLevels[level];
    setStocks((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, level: nextLvl } : s))
    );
  };

  const renderQueueCard = (o) => {
    const isHigh = o.priority === "High";
    const isLow = o.priority === "Low";
    const isNormal = o.priority === "Normal" || !o.priority;
    
    // Calculate live ticking elapsed time
    const elapsedMs = Date.now() - o.createdAt;
    const mins = Math.floor(elapsedMs / 60000);
    const secs = Math.floor((elapsedMs % 60000) / 1000);
    const elapsedStr = `${mins}m ${secs}s`;

    return (
      <div key={o.id} className={`queue-card-detailed-item ${isHigh ? "high-priority-pulse" : isLow ? "low-priority-style" : ""}`} style={{ marginBottom: "16px" }}>
        {/* Card top details */}
        <div className="queue-card-top-row">
          <span className="queue-card-id">{o.id}</span>
          
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Toggle Priority Button: High -> Normal -> Low -> High */}
            <button
              onClick={() => {
                setOrders((prev) =>
                  prev.map((item) => {
                    if (item.id === o.id) {
                      const nextLvl = item.priority === "High" ? "Normal" : item.priority === "Normal" ? "Low" : "High";
                      return { ...item, priority: nextLvl };
                    }
                    return item;
                  })
                );
              }}
              style={{
                background: "rgba(44,27,13,0.05)",
                color: "#2c1b0d",
                border: "none",
                padding: "3px 8px",
                fontSize: "10.5px",
                fontWeight: "bold",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Γ¡É Cycle Priority
            </button>

            <span className={`priority-badge-pill ${o.priority?.toLowerCase() || "normal"}`}>
              {isHigh ? "≡ƒÜ¿ HIGH" : isLow ? "≡ƒî▒ LOW" : "≡ƒòÆ STANDARD"}
            </span>
          </div>
        </div>

        {/* Card core body */}
        <div className="queue-card-body-wrap">
          <img src={o.img} alt={o.item} className="queue-card-thumbnail" />
          
          <div className="queue-card-text-details">
            <h4>{o.item}</h4>
            <span className="queue-customer-lbl">≡ƒæñ Client: {o.customer}</span>
            <span className="queue-office-lbl">≡ƒÅó Office: {o.office}</span>
            
            {/* Date and Time Placed */}
            <span style={{ fontSize: "11px", color: "#888", display: "block", marginTop: "2px" }}>
              ≡ƒôà Placed: {o.date} at {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>

            {/* Live Counting Timer */}
            <span style={{ fontSize: "11px", color: "#e74c3c", display: "block", marginTop: "4px", fontWeight: "bold" }}>
              ΓÅ│ Elapsed: {elapsedStr}
            </span>

            <div className="queue-customization-specs">
              <span>Sugar: {o.sugar}</span>
              <span>Milk: {o.milk}</span>
            </div>
          </div>
        </div>

        {/* Allocated Time / Users Wait Time Estimate Selector */}
        <div className="delivery-allocation-row" style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px", background: "#fbf9f6", padding: "10px", borderRadius: "10px", border: "1px solid rgba(44,27,13,0.05)" }}>
          <div style={{ flexGrow: 1 }}>
            <span style={{ fontSize: "10.5px", color: "#666", display: "block" }}>ΓÅ▒∩╕Å Allocated Delivery Time</span>
            <strong style={{ fontSize: "12px", color: "#2c1b0d" }}>
              {o.allocatedTime ? `Est. Wait: ${o.allocatedTime}` : "Not Allocated yet"}
            </strong>
          </div>

          <select
            value={o.allocatedTime || ""}
            onChange={(e) => allocateTime(o.id, e.target.value)}
            style={{
              background: "#ffffff",
              border: "1px solid rgba(44,27,13,0.15)",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "11px",
              color: "#2c1b0d",
              outline: "none",
            }}
          >
            <option value="">Set Time</option>
            <option value="10 mins">10 mins</option>
            <option value="15 mins">15 mins</option>
            <option value="20 mins">20 mins</option>
            <option value="30 mins">30 mins</option>
            <option value="40 mins">40 mins</option>
          </select>
        </div>

        {/* Card action controls */}
        <div className="queue-card-action-bar">
          <div>
            <span style={{ fontSize: "11px", color: "#888", display: "block" }}>Amount Total</span>
            <strong style={{ fontSize: "14px", color: "#2c1b0d" }}>{o.total}</strong>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {o.status === "Received" && (
              <>
                <button onClick={() => rejectSpecificOrder(o.id)} className="btn-action-outline reject">
                  Reject
                </button>
                <button onClick={() => acceptSpecificOrder(o.id)} className="btn-action-fill accept">
                  Accept & Prepare
                </button>
              </>
            )}
            {o.status === "Pending" && (
              <button
                onClick={() => {
                  setOrders((prev) =>
                    prev.map((item) => (item.id === o.id ? { ...item, status: "Shipped" } : item))
                  );
                }}
                className="btn-action-fill dispatch"
              >
                Ready to Dispatch
              </button>
            )}
            {o.status === "Shipped" && (
              <button
                onClick={() => {
                  setOrders((prev) =>
                    prev.map((item) => (item.id === o.id ? { ...item, status: "Delivered" } : item))
                  );
                }}
                className="btn-action-fill complete"
              >
                Complete Delivery
              </button>
            )}
            {o.status === "Delivered" && (
              <span className="served-status-success-badge">Γ£ô Served</span>
            )}
            {o.status === "Cancelled" && (
              <span style={{ fontSize: "12px", color: "#e74c3c", fontWeight: "bold" }}>Γ£ò Cancelled</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const activeUnservedOrders = orders.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled");
  const totalBrewsSummary = {};
  const addOnsSummary = { "Oat Milk": 0, "Almond Milk": 0, "No Sugar": 0, "Mild Sugar": 0 };

  activeUnservedOrders.forEach((o) => {
    const qtyMatch = o.item.match(/(.*?)\s*x\s*(\d+)/i);
    let baseName = o.item;
    let qty = 1;
    if (qtyMatch) {
      baseName = qtyMatch[1].trim();
      qty = parseInt(qtyMatch[2]);
    }
    totalBrewsSummary[baseName] = (totalBrewsSummary[baseName] || 0) + qty;

    if (o.milk && (o.milk === "Oat Milk" || o.milk === "Almond Milk" || o.milk === "Organic Oat Milk")) {
      const key = o.milk.includes("Oat") ? "Oat Milk" : "Almond Milk";
      addOnsSummary[key] = (addOnsSummary[key] || 0) + qty;
    }
    if (o.sugar && (o.sugar === "No Sugar" || o.sugar === "Mild Sugar")) {
      addOnsSummary[o.sugar] = (addOnsSummary[o.sugar] || 0) + qty;
    }
  });

  const itemImages = {
    "Classic Masala Chai": "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
    "Saffron Royal Chai": "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg",
    "Ginger Chai": "https://i.pinimg.com/736x/95/d1/9a/95d19a7cad652dd1caceb091c9794ac9.jpg",
    "Ginger (Adrak) Chai": "/chai-ingredients.png",
    "Kashmiri Kahwa": "https://i.pinimg.com/736x/c4/a8/cc/c4a8ccde9a67e5f24e2be4d0621f4186.jpg",
    "Kesar Saffron Royal Chai": "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg"
  };

  const pendingSidebarOrders = orders
    .filter((o) => o.status === "Received")
    .sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div style={{ background: "#fcfaf7", minHeight: "100vh", color: "#2c1b0d", fontFamily: "var(--font-body)", overflowX: "hidden" }}>
      
      {!isLoggedIn ? (
        <div className="login-gate-container">
          <form onSubmit={handleLoginSubmit} className="login-card">
            <div className="brewmaster-badge">BREWMASTER ACCESS ONLY</div>
            <h2>Authenticate Terminal</h2>
            <p>Enter operator credentials to link with active brewing controllers.</p>
            
            {loginError && <div className="login-error-alert">{loginError}</div>}

            <div className="form-group">
              <label>Operator Username</label>
              <input
                type="text"
                placeholder="Username (e.g. brewmaster)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="login-input"
              />
            </div>

            <div className="form-group">
              <label>Operator Password</label>
              <input
                type="password"
                placeholder="Password (e.g. chai)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="login-input"
              />
            </div>

            <button type="submit" className="btn-authenticate">
              AUTHENTICATE TERMINAL
            </button>
          </form>
        </div>
      ) : (
        /* BREWMASTER PANEL */
        <div className="dashboard-wrapper">
          
          {/* FIXED LEFT SIDEBAR */}
          <aside className="dashboard-sidebar">
            <div className="sidebar-logo">
              <svg width="32" height="32" viewBox="0 0 100 100" fill="none" style={{ display: "inline-block", verticalAlign: "middle" }}>
                <rect width="100" height="100" rx="20" fill="#fdf5e9" />
                <path d="M30 30h40v12H30V30zm0 24h40v12H30V54z" fill="#2c1b0d" />
              </svg>
              <span className="logo-text">ChaiCo.</span>
            </div>

            <div className="sidebar-menu">
              <button onClick={() => setActiveTab("dashboard")} className={`menu-icon-btn ${activeTab === "dashboard" ? "active" : ""}`}>
                <span className="btn-emoji">≡ƒôè</span> Dashboard
              </button>
              <button onClick={() => setActiveTab("queue")} className={`menu-icon-btn ${activeTab === "queue" ? "active" : ""}`}>
                <span className="btn-emoji">≡ƒôÑ</span> Order Queue
              </button>
              <button onClick={() => setActiveTab("prep")} className={`menu-icon-btn ${activeTab === "prep" ? "active" : ""}`}>
                <span className="btn-emoji">ΓÜí</span> Today's Prep
              </button>
              <button onClick={() => setActiveTab("stock")} className={`menu-icon-btn ${activeTab === "stock" ? "active" : ""}`}>
                <span className="btn-emoji">≡ƒôª</span> Stock & Alerts
              </button>
              <button onClick={() => setActiveTab("earnings")} className={`menu-icon-btn ${activeTab === "earnings" ? "active" : ""}`}>
                <span className="btn-emoji">≡ƒÆ░</span> Earnings & Payout
              </button>
              <button onClick={() => setActiveTab("history")} className={`menu-icon-btn ${activeTab === "history" ? "active" : ""}`}>
                <span className="btn-emoji">≡ƒô£</span> Order History
              </button>
              <button onClick={() => setActiveTab("menu")} className={`menu-icon-btn ${activeTab === "menu" ? "active" : ""}`}>
                <span className="btn-emoji">≡ƒì╜∩╕Å</span> Menu & Pricing
              </button>
              <button onClick={() => setActiveTab("subs")} className={`menu-icon-btn ${activeTab === "subs" ? "active" : ""}`}>
                <span className="btn-emoji">≡ƒôà</span> Subscriptions Due
              </button>
              <button onClick={() => setActiveTab("feedback")} className={`menu-icon-btn ${activeTab === "feedback" ? "active" : ""}`}>
                <span className="btn-emoji">Γ¡É</span> Ratings & Feedback
              </button>
              <button onClick={() => setActiveTab("leave")} className={`menu-icon-btn ${activeTab === "leave" ? "active" : ""}`}>
                <span className="btn-emoji">≡ƒÜ¬</span> Leave & Shift
              </button>
              <button onClick={() => setActiveTab("profile")} className={`menu-icon-btn ${activeTab === "profile" ? "active" : ""}`}>
                <span className="btn-emoji">ΓÜÖ∩╕Å</span> Profile & Settings
              </button>
            </div>

            <div className="sidebar-bottom">
              <button onClick={handleLogout} className="menu-icon-btn logout">
                <span className="btn-emoji">≡ƒöî</span> Disconnect Operator
              </button>
            </div>
          </aside>

          {/* MAIN CONTAINER */}
          <div className="dashboard-container">
            
            {/* TOP HEADER */}
            <header className="dashboard-header-new">
              <div>
                <span className="welcome-label">Welcome!</span>
                <h1 className="operator-title">John Hardward</h1>
              </div>

              <div className="header-search-box-wrap">
                <span className="search-icon-new">≡ƒöì</span>
                <input type="text" placeholder="Search Here" className="search-input-new" />
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <button onClick={triggerMockOrderAlert} className="alert-bell-btn" title="Simulate Alarm">
                  ≡ƒöö
                </button>
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                  alt="Profile"
                  className="profile-avatar-new"
                />
              </div>
            </header>

            {/* TAB CONTENT */}
            {activeTab === "dashboard" && (
              <div>
                
                {/* SUBHEADER */}
                <div className="sales-order-subheader">
                  <div>
                    <h2>Sales and Order</h2>
                    <p>Your Sales and Orders Summary Activates</p>
                  </div>

                  <div className="subheader-controls">
                    <button className="btn-export-data">
                      ≡ƒôñ Export Data
                    </button>
                    
                    <div className="filter-pill-group">
                      {["Daily", "Weekly", "Monthly"].map((pill) => (
                        <button
                          key={pill}
                          onClick={() => setTimeFilter(pill)}
                          className={`filter-pill-btn ${timeFilter === pill ? "active" : ""}`}
                        >
                          {pill}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* STATS ROW */}
                <div className="stats-cards-row-new">
                  <div className="stats-card-item">
                    <div className="stats-card-title-row">
                      <span className="stats-icon-circle red-bg">≡ƒôê</span>
                      <span>Total Sales</span>
                    </div>
                    <h3>{statsSummary.totalSales}</h3>
                    <span className="stats-percent-tag green">+8% <span style={{ color: "#777" }}>vs month</span></span>
                  </div>

                  <div className="stats-card-item">
                    <div className="stats-card-title-row">
                      <span className="stats-icon-circle yellow-bg">≡ƒ¢ì∩╕Å</span>
                      <span>Total Orders</span>
                    </div>
                    <h3>{statsSummary.totalOrders}</h3>
                    <span className="stats-percent-tag red">-3% <span style={{ color: "#777" }}>vs month</span></span>
                  </div>

                  <div className="stats-card-item">
                    <div className="stats-card-title-row">
                      <span className="stats-icon-circle green-bg">≡ƒÜÜ</span>
                      <span>Delivery Shipment</span>
                    </div>
                    <h3>{statsSummary.deliveryShipment}</h3>
                    <span className="stats-percent-tag green">+12% <span style={{ color: "#777" }}>vs month</span></span>
                  </div>

                  <div className="stats-card-item">
                    <div className="stats-card-title-row">
                      <span className="stats-icon-circle red-bg">≡ƒôª</span>
                      <span>Pending Shipment</span>
                    </div>
                    <h3>{statsSummary.pendingShipment}</h3>
                    <span className="stats-percent-tag red">-5% <span style={{ color: "#777" }}>vs month</span></span>
                  </div>

                  <div className="stats-card-item">
                    <div className="stats-card-title-row">
                      <span className="stats-icon-circle yellow-bg">≡ƒÆ╡</span>
                      <span>AVG Order Value</span>
                    </div>
                    <h3>{statsSummary.avgOrderValue}</h3>
                    <span className="stats-percent-tag green">+5% <span style={{ color: "#777" }}>vs month</span></span>
                  </div>
                </div>

                {/* MIDDLE ROW */}
                <div className="dashboard-double-row-grid">
                  <div className="dashboard-large-card">
                    <div className="card-header-new">
                      <h3>Sales Performance</h3>
                      <span className="payout-status-badge">Monthly Γê¿</span>
                    </div>
                    <div className="performance-tally-pills">
                      <span className="tally-pill red">Cranksets <strong style={{ marginLeft: "6px" }}>1,200 units</strong></span>
                      <span className="tally-pill yellow">Pedals <strong style={{ marginLeft: "6px" }}>1,000 units</strong></span>
                      <span className="tally-pill green">Brakes <strong style={{ marginLeft: "6px" }}>800 units</strong></span>
                    </div>

                    <div className="bar-chart-performance-visual">
                      <div className="y-axis-labels">
                        <span>250</span><span>200</span><span>150</span><span>100</span><span>50</span><span>0</span>
                      </div>
                      <div className="bars-track-new">
                        {[
                          { m: "Jan", h: 40 }, { m: "Feb", h: 60 }, { m: "Mar", h: 45 }, { m: "Apr", h: 70 },
                          { m: "May", h: 55 }, { m: "Jun", h: 80 }, { m: "Jul", h: 65 }, { m: "Aug", h: 90, highlighted: true },
                          { m: "Sep", h: 75 }, { m: "Oct", h: 60 }, { m: "Nov", h: 50 }, { m: "Dec", h: 30 }
                        ].map((bar, i) => (
                          <div key={i} className="bar-column-new">
                            <div className="bar-rect-track">
                              <div
                                className={`bar-rect-fill ${bar.highlighted ? "highlighted" : ""}`}
                                style={{ height: `${bar.h}%` }}
                              >
                                {bar.highlighted && (
                                  <div className="chart-tooltip-bubble">
                                    Total Revenue<br /><strong>Γé╣150,000</strong>
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="bar-month-lbl">{bar.m}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-large-card">
                    <div className="card-header-new">
                      <h3>Recent Orders</h3>
                    </div>
                    <div className="table-wrapper-new">
                      <table className="recent-orders-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Customer Name</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.slice(0, 4).map((o) => (
                            <tr key={o.id}>
                              <td><strong>{o.id}</strong></td>
                              <td>{o.customer}</td>
                              <td>{o.date}</td>
                              <td>
                                <span className={`table-status-pill ${o.status.toLowerCase()}`}>
                                  {o.status}
                                </span>
                              </td>
                              <td>{o.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* BOTTOM ROW */}
                <div className="dashboard-double-row-grid" style={{ marginTop: "28px" }}>
                  <div className="dashboard-large-card">
                    <div className="card-header-new">
                      <h3>Inventory Status Check</h3>
                    </div>
                    <div className="inventory-cards-grid-new">
                      {stocks.map((s, i) => (
                        <div key={i} className="inventory-progress-card-item">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong>{s.name.split(" ")[0]}</strong>
                            <span className="inventory-indicator-bullet">ΓùÅ</span>
                          </div>
                          <span style={{ fontSize: "12px", color: "#666", display: "block", marginTop: "4px" }}>
                            {s.qty}
                          </span>
                          <div className="inventory-progress-bar-wrap">
                            <div className="inventory-progress-bar-fill" style={{ width: "75%" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="dashboard-large-card">
                    <div className="card-header-new">
                      <h3>Customer Management</h3>
                    </div>
                    <div className="table-wrapper-new">
                      <table className="recent-orders-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Total Orders</th>
                            <th>Total Value</th>
                            <th>Loyalty Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerManagement.map((c, i) => (
                            <tr key={i}>
                              <td><strong>{c.name}</strong></td>
                              <td>{c.orders}</td>
                              <td>{c.value}</td>
                              <td>
                                <span className={`loyalty-pill ${c.loyalty.toLowerCase()}`}>
                                  {c.loyalty}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB: ORDER QUEUE */}
            {activeTab === "queue" && (
              <div className="tab-body-wrapper">
                
                {/* Summary of Active Brews on Top */}
                <div style={{ background: "#ffffff", padding: "20px", borderRadius: "24px", border: "1px solid rgba(44, 27, 13, 0.06)", marginBottom: "28px" }}>
                  <h4 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "800", color: "#2c1b0d" }}>≡ƒôè Live Queue Tally (Total Brew Volume)</h4>
                  
                  <div style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "10px" }}>
                    {Object.entries(totalBrewsSummary).map(([name, qty]) => {
                      const imgUrl = itemImages[name] || "/chai-ingredients.png";
                      return (
                        <div key={name} style={{ display: "flex", alignItems: "center", gap: "12px", background: "#fbf9f6", padding: "10px 16px", borderRadius: "16px", border: "1px solid rgba(0,0,0,0.03)", flexShrink: 0 }}>
                          <img src={imgUrl} alt={name} style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover" }} />
                          <div>
                            <strong style={{ fontSize: "15px", color: "#2c1b0d" }}>{qty} Cups</strong>
                            <span style={{ display: "block", fontSize: "11px", color: "#666" }}>{name}</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add-ons Tally */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(138, 88, 60, 0.05)", padding: "10px 16px", borderRadius: "16px", border: "1px solid rgba(138, 88, 60, 0.1)", flexShrink: 0 }}>
                      <span style={{ fontSize: "20px" }}>≡ƒî╛</span>
                      <div>
                        <strong style={{ fontSize: "14px", color: "#2c1b0d" }}>Add-on Milk Base</strong>
                        <span style={{ display: "block", fontSize: "11px", color: "#666" }}>
                          Oat: {addOnsSummary["Oat Milk"] || 0} | Almond: {addOnsSummary["Almond Milk"] || 0}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(138, 88, 60, 0.05)", padding: "10px 16px", borderRadius: "16px", border: "1px solid rgba(138, 88, 60, 0.1)", flexShrink: 0 }}>
                      <span style={{ fontSize: "20px" }}>≡ƒì¼</span>
                      <div>
                        <strong style={{ fontSize: "14px", color: "#2c1b0d" }}>Custom Sugar Levels</strong>
                        <span style={{ display: "block", fontSize: "11px", color: "#666" }}>
                          No Sugar: {addOnsSummary["No Sugar"] || 0} | Mild: {addOnsSummary["Mild Sugar"] || 0}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                <h3 className="section-title">Active Brewing Priority Board</h3>

                <div className="queue-kanban-board">
                  {/* COLUMN 1: HIGH PRIORITY */}
                  <div className="kanban-column high-col">
                    <div className="kanban-column-header">
                      <span>≡ƒÜ¿ High Priority</span>
                      <span className="kanban-badge red">
                        {orders.filter((o) => o.status !== "Delivered" && o.status !== "Completed" && o.priority === "High").length}
                      </span>
                    </div>
                    <div className="kanban-cards-stack">
                      {orders.filter((o) => o.status !== "Delivered" && o.status !== "Completed" && o.priority === "High").length === 0 ? (
                        <div className="empty-column-msg">No high priority orders</div>
                      ) : (
                        orders
                          .filter((o) => o.status !== "Delivered" && o.status !== "Completed" && o.priority === "High")
                          .sort((a, b) => a.id.localeCompare(b.id))
                          .map((o) => renderQueueCard(o))
                      )}
                    </div>
                  </div>

                  {/* COLUMN 2: STANDARD / NORMAL PRIORITY */}
                  <div className="kanban-column normal-col">
                    <div className="kanban-column-header">
                      <span>≡ƒòÆ Standard Priority</span>
                      <span className="kanban-badge chocolate">
                        {orders.filter((o) => o.status !== "Delivered" && o.status !== "Completed" && (o.priority === "Normal" || !o.priority)).length}
                      </span>
                    </div>
                    <div className="kanban-cards-stack">
                      {orders.filter((o) => o.status !== "Delivered" && o.status !== "Completed" && (o.priority === "Normal" || !o.priority)).length === 0 ? (
                        <div className="empty-column-msg">No standard orders</div>
                      ) : (
                        orders
                          .filter((o) => o.status !== "Delivered" && o.status !== "Completed" && (o.priority === "Normal" || !o.priority))
                          .sort((a, b) => a.id.localeCompare(b.id))
                          .map((o) => renderQueueCard(o))
                      )}
                    </div>
                  </div>

                  {/* COLUMN 3: LOW PRIORITY */}
                  <div className="kanban-column low-col">
                    <div className="kanban-column-header">
                      <span>≡ƒî▒ Low Priority</span>
                      <span className="kanban-badge green">
                        {orders.filter((o) => o.status !== "Delivered" && o.status !== "Completed" && o.priority === "Low").length}
                      </span>
                    </div>
                    <div className="kanban-cards-stack">
                      {orders.filter((o) => o.status !== "Delivered" && o.status !== "Completed" && o.priority === "Low").length === 0 ? (
                        <div className="empty-column-msg">No low priority orders</div>
                      ) : (
                        orders
                          .filter((o) => o.status !== "Delivered" && o.status !== "Completed" && o.priority === "Low")
                          .sort((a, b) => a.id.localeCompare(b.id))
                          .map((o) => renderQueueCard(o))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OTHER OPERATIONAL TABS */}
            {activeTab === "prep" && (
              <div className="tab-body-wrapper">
                
                {/* Stats Header Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
                  <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                    <span style={{ fontSize: "11px", color: "#666", display: "block" }}>Γÿò Total Beverage Tally</span>
                    <strong style={{ fontSize: "22px", color: "#2c1b0d" }}>78 Cups Required</strong>
                  </div>
                  <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                    <span style={{ fontSize: "11px", color: "#666", display: "block" }}>≡ƒÅó Route Groups (Floors)</span>
                    <strong style={{ fontSize: "22px", color: "#2c1b0d" }}>3 Office Floors</strong>
                  </div>
                  <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                    <span style={{ fontSize: "11px", color: "#666", display: "block" }}>≡ƒòÆ Next Peak Rush Prediction</span>
                    <strong style={{ fontSize: "16px", color: "#e74c3c", display: "block", marginTop: "4px" }}>9:00 - 9:30 AM (Pre-brew 20c)</strong>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "28px" }}>
                  
                  {/* Left Column: Detailed Beverage prep cards */}
                  <div>
                    <h3 className="section-title">Today's Cooking Prep Tally</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                      {[
                        {
                          name: "Classic Masala Chai",
                          qty: 24,
                          brewed: 18,
                          img: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
                          recipe: "Assam base + crushed winter spices + whole milk",
                        },
                        {
                          name: "Cardamom (Elaichi) Chai",
                          qty: 18,
                          brewed: 14,
                          img: "https://i.pinimg.com/1200x/5c/b8/8a/5cb88a02e013987379378009ba8d7eb2.jpg",
                          recipe: "Elaichi pods + CTC tea + whole milk + low sugar",
                        },
                        {
                          name: "Ginger (Adrak) Chai",
                          qty: 15,
                          brewed: 9,
                          img: "https://i.pinimg.com/736x/95/d1/9a/95d19a7cad652dd1caceb091c9794ac9.jpg",
                          recipe: "Fresh farm grated ginger + CTC granules + light milk",
                        },
                        {
                          name: "Saffron Royal Chai",
                          qty: 9,
                          brewed: 5,
                          img: "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg",
                          recipe: "Luxury Kashmiri saffron + cardamoms + thick milk base",
                        },
                        {
                          name: "Kashmiri Kahwa",
                          qty: 12,
                          brewed: 8,
                          img: "https://i.pinimg.com/736x/c4/a8/cc/c4a8ccde9a67e5f24e2be4d0621f4186.jpg",
                          recipe: "Green tea leaves + saffron strands + cinnamon + almond slivers",
                        },
                      ].map((item, idx) => {
                        const progress = (item.brewed / item.qty) * 100;
                        return (
                          <div key={idx} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "18px" }}>
                            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "12px" }}>
                              <img src={item.img} alt={item.name} className="queue-card-thumbnail" style={{ width: "56px", height: "56px" }} />
                              <div>
                                <h4 style={{ fontSize: "14px", margin: "0 0 4px" }}>{item.name}</h4>
                                <span style={{ fontSize: "10px", color: "#777", display: "block" }}>{item.recipe}</span>
                              </div>
                            </div>

                            <div style={{ margin: "10px 0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                                <span>Progress (Brewed)</span>
                                <strong>{item.brewed} / {item.qty} cups</strong>
                              </div>
                              <div className="inventory-progress-bar-wrap" style={{ background: "rgba(44, 27, 13, 0.05)", height: "6px" }}>
                                <div className="inventory-progress-bar-fill" style={{ width: `${progress}%`, background: "#2c1b0d" }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Routing optimization & Rush alerts */}
                  <div>
                    <h3 className="section-title">Route Optimizer (Floors)</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {[
                        {
                          floor: "Floor 5 (Block B)",
                          items: "5x Masala Chai, 2x Almond Cookies",
                          status: "High Demand",
                          courier: "Ramesh Kumar",
                        },
                        {
                          floor: "Floor 3 (Main Hall)",
                          items: "3x Ginger Chai, 4x Saffron Chai",
                          status: "Medium Demand",
                          courier: "Suresh Singh",
                        },
                        {
                          floor: "Floor 4 (Executive Cabin)",
                          items: "2x Kashmiri Kahwa, 1x Cardamom Chai",
                          status: "Normal",
                          courier: "Mahesh Pal",
                        },
                      ].map((route, i) => (
                        <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <h4 style={{ fontSize: "13.5px", margin: 0 }}>≡ƒÅó {route.floor}</h4>
                            <span className="priority-badge-pill normal" style={{ background: route.status === "High Demand" ? "rgba(231,76,60,0.1)" : "rgba(44,27,13,0.05)", color: route.status === "High Demand" ? "#e74c3c" : "#2c1b0d", fontSize: "9px" }}>
                              {route.status}
                            </span>
                          </div>
                          <p style={{ fontSize: "12px", color: "#666", margin: "0 0 8px" }}>≡ƒôª items: <strong>{route.items}</strong></p>
                          <div style={{ borderTop: "1px dashed rgba(0,0,0,0.05)", paddingTop: "8px", fontSize: "11px", display: "flex", justifyContent: "space-between" }}>
                            <span>Runner Allocated</span>
                            <strong>≡ƒÅâ {route.courier}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {activeTab === "stock" && (() => {
              const totalValuation = stocks.reduce((acc, curr) => {
                const numericVal = parseFloat(curr.qty.split(" ")[0]) || 0;
                return acc + (numericVal * (curr.unitPrice || 0));
              }, 0);

              return (
                <div className="tab-body-wrapper">
                  {/* Toast Message Overlay */}
                  {toastMsg && (
                    <div style={{ position: "fixed", top: "24px", right: "24px", background: "#2c1b0d", color: "#fdf5e9", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 9999, fontWeight: "bold", borderLeft: "4px solid #e74c3c", display: "flex", gap: "10px", alignItems: "center" }}>
                      <span>≡ƒÜ¿</span> {toastMsg}
                    </div>
                  )}

                  {/* Summary Bar */}
                  <div style={{ background: "#ffffff", padding: "20px", borderRadius: "24px", border: "1px solid rgba(44, 27, 13, 0.06)", marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "11px", color: "#666", textTransform: "uppercase", display: "block" }}>≡ƒÆ░ Total Inventory Valuation</span>
                      <strong style={{ fontSize: "24px", color: "#2c1b0d" }}>Γé╣{totalValuation.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "12px", color: "#666" }}>Auto-Alert to Admin (Low Stock)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAutoAlertEnabled(!autoAlertEnabled);
                          setToastMsg(autoAlertEnabled ? "Disabled low stock auto-alerts" : "Enabled low stock auto-alerts");
                          setTimeout(() => setToastMsg(""), 3000);
                        }}
                        style={{
                          background: autoAlertEnabled ? "#2c1b0d" : "#e0dcd5",
                          color: autoAlertEnabled ? "#fff" : "#666",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "20px",
                          fontSize: "11.5px",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        {autoAlertEnabled ? "≡ƒƒó ENABLED" : "≡ƒö┤ DISABLED"}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
                    
                    {/* Left Column: Cards List */}
                    <div>
                      <h3 className="section-title">Current Kitchen Ingredients Stock</h3>
                      <div className="stocks-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                        {stocks.map((s, idx) => {
                          const isEditing = editingStockIdx === idx;
                          const numericQty = parseFloat(s.qty.split(" ")[0]) || 0;
                          const itemValue = numericQty * (s.unitPrice || 0);

                          return (
                            <div key={idx} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "20px" }}>
                              
                              {isEditing ? (
                                /* EDITING MODE FORM */
                                <div>
                                  <h4 style={{ fontSize: "14px", margin: "0 0 12px", color: "#8a583c" }}>Edit: {s.name}</h4>
                                  
                                  <div className="form-group" style={{ marginBottom: "10px" }}>
                                    <label style={{ fontSize: "10px", color: "#666", fontWeight: "bold" }}>Remaining Quantity</label>
                                    <input
                                      type="text"
                                      value={editStockQty}
                                      onChange={(e) => setEditStockQty(e.target.value)}
                                      style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }}
                                    />
                                  </div>

                                  <div className="form-group" style={{ marginBottom: "12px" }}>
                                    <label style={{ fontSize: "10px", color: "#666", fontWeight: "bold" }}>Status Indicator</label>
                                    <select
                                      value={editStockLevel}
                                      onChange={(e) => setEditStockLevel(e.target.value)}
                                      style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "12.5px" }}
                                    >
                                      <option value="In Stock">In Stock</option>
                                      <option value="Low Stock">Low Stock</option>
                                      <option value="Out of Stock">Out of Stock</option>
                                    </select>
                                  </div>

                                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                                    <button
                                      type="button"
                                      onClick={() => setEditingStockIdx(null)}
                                      style={{ flex: 1, padding: "6px", background: "#fbf9f6", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveStockEdit(idx)}
                                      style={{ flex: 1, padding: "6px", background: "#2c1b0d", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* NORMAL VIEW MODE */
                                <div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                                    <h4 style={{ fontSize: "14px", margin: 0, fontWeight: "bold" }}>{s.name}</h4>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingStockIdx(idx);
                                        setEditStockQty(s.qty);
                                        setEditStockLevel(s.level);
                                      }}
                                      style={{ background: "transparent", border: "none", color: "#8a583c", fontSize: "11.5px", fontWeight: "bold", cursor: "pointer", padding: 0 }}
                                    >
                                      Γ£Å∩╕Å Edit
                                    </button>
                                  </div>
                                  <p style={{ fontSize: "12px", color: "#666", margin: "0 0 6px" }}>Status Qty: <strong>{s.qty}</strong></p>
                                  
                                  {/* Pricing details */}
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#888", marginBottom: "12px", padding: "6px 0", borderTop: "1px solid rgba(0,0,0,0.03)", borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                                    <span>Rate: Γé╣{s.unitPrice || 150} / {s.unit || "Kg"}</span>
                                    <span>Value: <strong>Γé╣{itemValue.toLocaleString()}</strong></span>
                                  </div>

                                  {/* Supplier Detail */}
                                  <p style={{ fontSize: "10.5px", color: "#666", margin: "0 0 14px", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span>≡ƒÅ¡ Vendor: {s.supplier || "Market Vendor"}</span>
                                  </p>
                                  
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span
                                      className={`stock-indicator-pill ${s.level.toLowerCase().replace(/ /g, "-")}`}
                                      style={{
                                        padding: "6px 12px",
                                        borderRadius: "6px",
                                        fontSize: "11px",
                                        fontWeight: "800",
                                        background: s.level === "In Stock" ? "rgba(39, 174, 96, 0.15)" : s.level === "Low Stock" ? "rgba(241, 196, 15, 0.15)" : "rgba(231, 76, 60, 0.15)",
                                        color: s.level === "In Stock" ? "#27ae60" : s.level === "Low Stock" ? "#d35400" : "#e74c3c"
                                      }}
                                    >
                                      ΓùÅ {s.level}
                                    </span>
                                    
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedItem(s.name);
                                        setRequestQty(s.qty.split(" ")[0] !== "0" ? s.qty.split(" ")[0] + " " + (s.qty.split(" ")[1] || "Units") : "20 Kg");
                                      }}
                                      className="btn-raise-restock"
                                      style={{
                                        background: "transparent",
                                        border: "1px dashed rgba(44, 27, 13, 0.3)",
                                        color: "#2c1b0d",
                                        padding: "6px 12px",
                                        fontSize: "11px",
                                        fontWeight: "750",
                                        borderRadius: "6px",
                                        cursor: "pointer"
                                      }}
                                    >
                                      ΓÜí Request Restock
                                    </button>
                                  </div>
                                </div>
                              )}

                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Column: Add New Stock, Alert Form & History Logs */}
                    <div>
                      
                      {/* Add Stock Item Form */}
                      <h3 className="section-title">Add Ingredient Item</h3>
                      <form onSubmit={handleAddNewStock} style={{ background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)", marginBottom: "28px" }}>
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10.5px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Item Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Cinnamon Sticks, Tea Cups"
                            value={newStockName}
                            onChange={(e) => setNewStockName(e.target.value)}
                            required
                            style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10.5px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Initial Quantity</label>
                          <input
                            type="text"
                            placeholder="e.g. 5 Kg, 1000 Units"
                            value={newStockQty}
                            onChange={(e) => setNewStockQty(e.target.value)}
                            required
                            style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "10.5px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Status</label>
                          <select
                            value={newStockLevel}
                            onChange={(e) => setNewStockLevel(e.target.value)}
                            style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "12.5px" }}
                          >
                            <option value="In Stock">In Stock</option>
                            <option value="Low Stock">Low Stock</option>
                            <option value="Out of Stock">Out of Stock</option>
                          </select>
                        </div>

                        <button type="submit" style={{ width: "100%", background: "#8a583c", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
                          + ADD NEW INGREDIENT
                        </button>
                      </form>

                      {/* Restock History Log */}
                      <h3 className="section-title">ΓÅ▒∩╕Å Recent Incoming Shipments</h3>
                      <div style={{ background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)", marginBottom: "28px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {restockHistory.map((hist, i) => (
                            <div key={i} style={{ fontSize: "12px", borderBottom: "1px solid #f2eee9", paddingBottom: "8px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                <strong>{hist.item} ({hist.qty})</strong>
                                <span style={{ color: "#888" }}>{hist.date}</span>
                              </div>
                              <span style={{ color: "#666", fontSize: "11px" }}>Source: {hist.source}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Raise Restock Alert Form */}
                      <h3 className="section-title">Raise Restock Request</h3>
                      <form onSubmit={handleRaiseAlert} style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)", marginBottom: "28px" }}>
                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Select Ingredient</label>
                          <select
                            value={selectedItem}
                            onChange={(e) => setSelectedItem(e.target.value)}
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "13px" }}
                          >
                            {stocks.map((s, i) => (
                              <option key={i} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Requested Quantity</label>
                          <input
                            type="text"
                            placeholder="e.g. 20 Kg, 50 Litres"
                            value={requestQty}
                            onChange={(e) => setRequestQty(e.target.value)}
                            required
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "13px" }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Urgency Level</label>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {["Low", "Medium", "High"].map((level) => (
                              <button
                                key={level}
                                type="button"
                                onClick={() => setUrgency(level)}
                                style={{
                                  flex: 1,
                                  padding: "8px",
                                  border: "1.5px solid",
                                  borderColor: urgency === level ? "#2c1b0d" : "rgba(44,27,13,0.1)",
                                  background: urgency === level ? "#2c1b0d" : "transparent",
                                  color: urgency === level ? "#ffffff" : "#2c1b0d",
                                  borderRadius: "6px",
                                  fontSize: "11.5px",
                                  fontWeight: "bold",
                                  cursor: "pointer"
                                }}
                              >
                                {level === "High" ? "≡ƒÜ¿ High" : level}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: "20px" }}>
                          <label style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Urgent Notes (optional)</label>
                          <textarea
                            placeholder="Why is this restock urgent?"
                            value={requestNotes}
                            onChange={(e) => setRequestNotes(e.target.value)}
                            rows="2"
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "13px", resize: "none" }}
                          />
                        </div>

                        <button type="submit" style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer", letterSpacing: "0.5px" }}>
                          SEND ALERT TO ADMIN
                        </button>
                      </form>

                      {/* Logs of Raised Requests */}
                      <h4 style={{ fontSize: "13px", color: "#2c1b0d", marginBottom: "12px", fontWeight: "800" }}>≡ƒôï Restock Requests Log</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {restockRequests.map((r, i) => (
                          <div key={i} style={{ background: "#ffffff", padding: "12px 16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.03)", fontSize: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <strong>{r.item}</strong>
                              <span style={{ fontSize: "10px", background: r.urgency === "High" ? "rgba(231,76,60,0.1)" : "rgba(0,0,0,0.05)", color: r.urgency === "High" ? "#e74c3c" : "#555", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                {r.urgency} Urgency
                              </span>
                            </div>
                            <span style={{ display: "block", color: "#666" }}>Qty Requested: {r.qty}</span>
                            <span style={{ display: "block", color: "#888", fontStyle: "italic", fontSize: "11px", marginTop: "2px" }}>Notes: {r.notes}</span>
                            
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", borderTop: "1px solid rgba(0,0,0,0.02)", paddingTop: "6px", fontSize: "10px" }}>
                              <span style={{ color: "#27ae60" }}>ΓùÅ {r.status}</span>
                              <span style={{ color: "#999" }}>{r.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>

                  </div>
                </div>
              )
            })()}

            {activeTab === "earnings" && (() => {
              const transactions = [
                { id: "TXN-8801", name: "Aarav Mehta", method: "UPI (GPay)", amount: "Γé╣298", time: "10 mins ago", status: "Successful" },
                { id: "TXN-8802", name: "Priya Patel", method: "Wallet Balance", amount: "Γé╣450", time: "22 mins ago", status: "Successful" },
                { id: "TXN-8803", name: "Karan Johar", method: "Credit Card", amount: "Γé╣596", time: "1 hour ago", status: "Successful" },
                { id: "TXN-8804", name: "Rohan Sharma", method: "UPI (PhonePe)", amount: "Γé╣169", time: "3 hours ago", status: "Successful" },
                { id: "TXN-8805", name: "Sunita Rao", method: "UPI (Paytm)", amount: "Γé╣318", time: "4 hours ago", status: "Successful" },
                { id: "TXN-8806", name: "Kabir Singh", method: "Wallet Balance", amount: "Γé╣249", time: "Yesterday", status: "Successful" },
              ];

              const chartData = [
                { day: "Mon", val: 60, amount: "Γé╣15,000" },
                { day: "Tue", val: 80, amount: "Γé╣22,000" },
                { day: "Wed", val: 45, amount: "Γé╣11,500" },
                { day: "Thu", val: 95, amount: "Γé╣29,800" },
                { day: "Fri", val: 70, amount: "Γé╣19,200" },
                { day: "Sat", val: 30, amount: "Γé╣8,000" },
                { day: "Sun", val: 90, amount: "Γé╣25,300" },
              ];

              return (
                <div className="tab-body-wrapper">
                  
                  {/* Earnings Metrics Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
                    <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>≡ƒÆ░ Total Gross Earnings</span>
                      <strong style={{ fontSize: "24px", color: "#2c1b0d" }}>Γé╣125,000</strong>
                      <span style={{ fontSize: "10.5px", color: "#27ae60", display: "block", marginTop: "4px" }}>Γû▓ +14% from last week</span>
                    </div>
                    <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>≡ƒÅª Pending Payout (Auto-Transfer)</span>
                      <strong style={{ fontSize: "24px", color: "#2c1b0d" }}>Γé╣18,400</strong>
                      <span style={{ fontSize: "10.5px", color: "#8a583c", display: "block", marginTop: "4px" }}>Scheduled: Friday, 6:00 PM</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>≡ƒÆ│ Total Payments Settled</span>
                      <strong style={{ fontSize: "24px", color: "#2c1b0d" }}>450 Transactions</strong>
                      <span style={{ fontSize: "10.5px", color: "#27ae60", display: "block", marginTop: "4px" }}>≡ƒƒó UPI gateway healthy</span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
                    
                    {/* Left Column: Earnings Graph & settlements */}
                    <div>
                      <h3 className="section-title">Weekly Revenue Trends</h3>
                      
                      {/* Premium CSS Chart */}
                      <div style={{ background: "#ffffff", padding: "24px", borderRadius: "24px", border: "1px solid rgba(44, 27, 13, 0.04)", marginBottom: "28px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: "200px", paddingBottom: "10px", borderBottom: "1px solid rgba(0,0,0,0.06)", position: "relative" }}>
                          
                          {/* Y-Axis Guideline markers */}
                          <div style={{ position: "absolute", left: 0, right: 0, top: "25%", borderBottom: "1px dashed rgba(0,0,0,0.03)", pointerEvents: "none" }} />
                          <div style={{ position: "absolute", left: 0, right: 0, top: "50%", borderBottom: "1px dashed rgba(0,0,0,0.03)", pointerEvents: "none" }} />
                          <div style={{ position: "absolute", left: 0, right: 0, top: "75%", borderBottom: "1px dashed rgba(0,0,0,0.03)", pointerEvents: "none" }} />

                          {chartData.map((d, i) => (
                            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, position: "relative", zIndex: 1 }}>
                              
                              {/* Hover Tooltip Value */}
                              <span style={{ fontSize: "10px", background: "#2c1b0d", color: "#fdf5e9", padding: "2px 6px", borderRadius: "4px", position: "absolute", bottom: `${d.val + 8}%`, opacity: 0.9, fontWeight: "bold" }}>
                                {d.amount}
                              </span>

                              {/* Bar */}
                              <div
                                style={{
                                  width: "28px",
                                  height: `${(d.val / 100) * 160}px`,
                                  background: "linear-gradient(180deg, #8a583c 0%, #2c1b0d 100%)",
                                  borderRadius: "6px 6px 0 0",
                                  transition: "transform 0.2s",
                                  cursor: "pointer"
                                }}
                              />
                              <span style={{ fontSize: "11px", color: "#666", marginTop: "8px", fontWeight: "bold" }}>{d.day}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Daily settlements breakdown list */}
                      <h3 className="section-title">Today's Settlement Details</h3>
                      <div style={{ background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                        {todaySettlements.map((s, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: i === todaySettlements.length - 1 ? "none" : "1px solid rgba(0,0,0,0.04)", fontSize: "13px" }}>
                            <span style={{ color: "#555" }}>{s.item}</span>
                            <strong style={{ color: "#2c1b0d" }}>{s.value}</strong>
                          </div>
                        ))}
                      </div>

                    </div>

                    {/* Right Column: Payments transaction feed */}
                    <div>
                      <h3 className="section-title">All Transaction Payments</h3>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {transactions.map((t, idx) => (
                          <div key={idx} style={{ background: "#ffffff", padding: "16px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <strong style={{ fontSize: "13.5px", display: "block", color: "#2c1b0d" }}>{t.name}</strong>
                              <span style={{ fontSize: "11px", color: "#666" }}>{t.method} ΓÇó {t.time}</span>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <strong style={{ fontSize: "15px", display: "block", color: "#27ae60" }}>{t.amount}</strong>
                              <span style={{ fontSize: "9px", background: "rgba(39, 174, 96, 0.1)", color: "#27ae60", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                {t.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>

                  </div>

                </div>
              );
            })()}

            {activeTab === "history" && (() => {
              const filteredHistory = historyOrders.filter((h) => {
                if (historyDateFilter === "today") {
                  return h.date.includes("09/12/2026");
                }
                if (historyDateFilter === "7days") {
                  return h.date.includes("09/12/2026") || h.date.includes("09/11/2026");
                }
                return true;
              });

              return (
                <div className="tab-body-wrapper">
                  
                  {/* Invoice Modal Overlay */}
                  {activeInvoice && (() => {
                    const cleanId = activeInvoice.id.replace("#", "");
                    const priceVal = parseFloat(activeInvoice.total.replace("Γé╣", "")) || 0;
                    const subTotal = (priceVal / 1.05).toFixed(2);
                    const taxVal = (priceVal - subTotal).toFixed(2);

                    return (
                      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.65)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000, overflowY: "auto", padding: "20px" }}>
                        <style>{`
                          @media print {
                            body {
                              background: #ffffff !important;
                            }
                            body * {
                              visibility: hidden !important;
                            }
                            #printable-invoice-card, #printable-invoice-card * {
                              visibility: visible !important;
                            }
                            #printable-invoice-card {
                              position: absolute !important;
                              left: 0 !important;
                              top: 0 !important;
                              width: 100% !important;
                              border: none !important;
                              box-shadow: none !important;
                              padding: 0 !important;
                              margin: 0 !important;
                            }
                            .no-print {
                              display: none !important;
                            }
                          }
                        `}</style>
                        {/* Wrapper for Printable card and control buttons */}
                        <div style={{ width: "680px" }}>
                          
                          {/* Close & Print Buttons Panel */}
                          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                            <button
                              type="button"
                              onClick={() => setActiveInvoice(null)}
                              style={{ padding: "8px 16px", background: "rgba(255,255,255,0.9)", border: "1px solid rgba(44,27,13,0.15)", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "12px", color: "#2c1b0d" }}
                            >
                              Γ£ò Close Invoice View
                            </button>
                            <button
                              type="button"
                              onClick={() => window.print()}
                              style={{ padding: "8px 20px", background: "#2c1b0d", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}
                            >
                              ≡ƒû¿∩╕Å Print or Download PDF
                            </button>
                          </div>

                          {/* INVOICE CARD (replicates corporate template layout) */}
                          <div id="printable-invoice-card" style={{ background: "#ffffff", padding: "48px", borderRadius: "8px", boxShadow: "0 10px 40px rgba(0,0,0,0.15)", border: "1px solid rgba(0,0,0,0.08)", color: "#2c1b0d", fontFamily: "Arial, sans-serif" }}>
                            
                            {/* Row 1: Logo & INVOICE header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "28px" }}>≡ƒì╡</span>
                                <div>
                                  <strong style={{ fontSize: "20px", color: "#2c1b0d", letterSpacing: "0.5px" }}>CHAI HEROES</strong>
                                  <span style={{ display: "block", fontSize: "9px", color: "#8a583c", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "1px" }}>Brewmaster Terminal</span>
                                </div>
                              </div>
                              <h1 style={{ fontSize: "28px", color: "#2c1b0d", letterSpacing: "2px", margin: 0, fontWeight: "300", textTransform: "uppercase" }}>INVOICE</h1>
                            </div>

                            {/* Row 2: Details Columns */}
                            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 2fr", gap: "16px", borderBottom: "1px solid #eee", paddingBottom: "20px", marginBottom: "20px" }}>
                              <div>
                                <span style={{ fontSize: "10.5px", color: "#888", display: "block", textTransform: "uppercase", marginBottom: "4px" }}>Invoice no.</span>
                                <strong style={{ fontSize: "13px" }}>#CH-{cleanId}</strong>
                              </div>
                              <div>
                                <span style={{ fontSize: "10.5px", color: "#888", display: "block", textTransform: "uppercase", marginBottom: "4px" }}>Date</span>
                                <strong style={{ fontSize: "13px" }}>{activeInvoice.date.split(" ")[0]}</strong>
                              </div>
                              <div>
                                <span style={{ fontSize: "10.5px", color: "#888", display: "block", textTransform: "uppercase", marginBottom: "4px" }}>Invoice to:</span>
                                <strong style={{ fontSize: "13.5px", display: "block" }}>{activeInvoice.customer}</strong>
                                <span style={{ fontSize: "11px", color: "#666" }}>Corporate Desk Partner</span>
                              </div>
                            </div>

                            {/* Row 3: Total Due block */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fbf9f6", padding: "20px 24px", borderRadius: "6px", marginBottom: "28px", border: "1px solid rgba(44,27,13,0.03)" }}>
                              <div>
                                <span style={{ fontSize: "10px", color: "#8a583c", textTransform: "uppercase", display: "block", fontWeight: "bold", letterSpacing: "0.5px" }}>TOTAL DUE</span>
                                <strong style={{ fontSize: "24px", color: "#2c1b0d" }}>{activeInvoice.total}</strong>
                              </div>
                              <div style={{ textAlign: "right", fontSize: "11.5px", color: "#555" }}>
                                <span style={{ display: "block", fontWeight: "bold", color: "#2c1b0d" }}>≡ƒôì Delivery Destination</span>
                                <span>{activeInvoice.office}</span>
                              </div>
                            </div>

                            {/* Row 4: Main Itemized Table */}
                            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "28px" }}>
                              <thead>
                                <tr style={{ background: "#2c1b0d", color: "#ffffff", fontSize: "12px", textTransform: "uppercase" }}>
                                  <th style={{ padding: "10px 16px", textAlign: "left", borderRadius: "4px 0 0 4px" }}>Item Description</th>
                                  <th style={{ padding: "10px 16px", textAlign: "right" }}>Unit Price</th>
                                  <th style={{ padding: "10px 16px", textAlign: "center" }}>Qty</th>
                                  <th style={{ padding: "10px 16px", textAlign: "right", borderRadius: "0 4px 4px 0" }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr style={{ borderBottom: "1px solid #eee", fontSize: "13px" }}>
                                  <td style={{ padding: "16px" }}>
                                    <strong style={{ display: "block" }}>{activeInvoice.items}</strong>
                                    <span style={{ fontSize: "11px", color: "#666" }}>Pref: {activeInvoice.customization}</span>
                                  </td>
                                  <td style={{ padding: "16px", textAlign: "right" }}>Γé╣{subTotal}</td>
                                  <td style={{ padding: "16px", textAlign: "center" }}>1</td>
                                  <td style={{ padding: "16px", textAlign: "right", fontWeight: "bold" }}>Γé╣{subTotal}</td>
                                </tr>
                              </tbody>
                            </table>

                            {/* Row 5: Payout acceptance & totals */}
                            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "40px", marginBottom: "40px" }}>
                              <div>
                                <strong style={{ fontSize: "11px", textTransform: "uppercase", display: "block", color: "#666", marginBottom: "8px" }}>Payment Method We Accept</strong>
                                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                  <span style={{ fontSize: "12px", background: "rgba(44,27,13,0.05)", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold" }}>UPI (Instant)</span>
                                  <span style={{ fontSize: "12px", background: "rgba(44,27,13,0.05)", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold" }}>Corporate Wallet</span>
                                </div>
                              </div>

                              <div style={{ fontSize: "12.5px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#666" }}>
                                  <span>Sub Total:</span>
                                  <span>Γé╣{subTotal}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#666", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
                                  <span>Tax (GST 5%):</span>
                                  <span>Γé╣{taxVal}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#2c1b0d", color: "#ffffff", borderRadius: "4px", marginTop: "10px", fontWeight: "bold" }}>
                                  <span>Grand Total:</span>
                                  <span>{activeInvoice.total}</span>
                                </div>
                              </div>
                            </div>

                            {/* Signature element */}
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "40px" }}>
                              <div style={{ textAlign: "center", width: "160px" }}>
                                <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "16px", color: "#8a583c", display: "block", marginBottom: "4px" }}>Brewmaster Admin</span>
                                <div style={{ borderTop: "1px solid #ccc", paddingTop: "6px", fontSize: "10.5px", color: "#888", textTransform: "uppercase", fontWeight: "bold" }}>Accounts Manager</div>
                              </div>
                            </div>

                            {/* Bottom Info bar */}
                            <div style={{ borderTop: "1px solid #eee", marginTop: "40px", paddingTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "9.5px", color: "#999" }}>
                              <span>≡ƒÅó Corporate Park Hub Road, Block A</span>
                              <span>≡ƒô₧ Support Desk: +91 99999 00000</span>
                              <span>Γ£ë∩╕Å billing@chaiheroes.com</span>
                            </div>

                          </div>
                        </div>

                      </div>
                    );
                  })()}

                  {/* Stats Info Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
                    <div style={{ background: "#ffffff", padding: "18px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>Γÿò Total Served Brews</span>
                      <strong style={{ fontSize: "20px", color: "#2c1b0d" }}>446 Completed</strong>
                    </div>
                    <div style={{ background: "#ffffff", padding: "18px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>≡ƒôê Settlement Success Rate</span>
                      <strong style={{ fontSize: "20px", color: "#27ae60" }}>99.1% Successful</strong>
                    </div>
                    <div style={{ background: "#ffffff", padding: "18px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>≡ƒ¢æ Cancelled / Refunded</span>
                      <strong style={{ fontSize: "20px", color: "#e74c3c" }}>4 Invoices</strong>
                    </div>
                  </div>

                  {/* View Toggles & Filters Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
                    
                    {/* Date Filters */}
                    <div style={{ display: "flex", background: "rgba(44,27,13,0.05)", padding: "4px", borderRadius: "8px" }}>
                      {["today", "7days", "all"].map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setHistoryDateFilter(filter)}
                          style={{
                            padding: "6px 14px",
                            border: "none",
                            background: historyDateFilter === filter ? "#2c1b0d" : "transparent",
                            color: historyDateFilter === filter ? "#ffffff" : "#2c1b0d",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            textTransform: "capitalize"
                          }}
                        >
                          {filter === "7days" ? "Last 7 Days" : filter}
                        </button>
                      ))}
                    </div>

                    {/* Format Layout Toggle */}
                    <div style={{ display: "flex", background: "rgba(44,27,13,0.05)", padding: "4px", borderRadius: "8px" }}>
                      <button
                        type="button"
                        onClick={() => setHistoryViewMode("grid")}
                        style={{
                          padding: "6px 14px",
                          border: "none",
                          background: historyViewMode === "grid" ? "#2c1b0d" : "transparent",
                          color: historyViewMode === "grid" ? "#ffffff" : "#2c1b0d",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        ≡ƒô▒ Grid View
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryViewMode("list")}
                        style={{
                          padding: "6px 14px",
                          border: "none",
                          background: historyViewMode === "list" ? "#2c1b0d" : "transparent",
                          color: historyViewMode === "list" ? "#ffffff" : "#2c1b0d",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        ≡ƒôï List View
                      </button>
                    </div>

                  </div>

                  {/* Toast Message Overlay */}
                  {toastMsg && (
                    <div style={{ position: "fixed", top: "24px", right: "24px", background: "#2c1b0d", color: "#fdf5e9", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 9999, fontWeight: "bold", display: "flex", gap: "10px", alignItems: "center" }}>
                      <span>≡ƒû¿∩╕Å</span> {toastMsg}
                    </div>
                  )}

                  {/* Render List or Grid */}
                  {historyViewMode === "grid" ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                      {filteredHistory.map((h, i) => (
                        <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "20px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid rgba(0,0,0,0.03)", paddingBottom: "8px" }}>
                            <span style={{ fontSize: "13px", fontWeight: "800", color: "#8a583c" }}>{h.id}</span>
                            <span style={{ fontSize: "11px", color: "#888" }}>{h.date}</span>
                          </div>
                          
                          <div style={{ marginBottom: "14px" }}>
                            <span style={{ fontSize: "14px", display: "block", fontWeight: "bold" }}>≡ƒæñ {h.customer}</span>
                            <span style={{ fontSize: "12px", color: "#555", display: "block", margin: "4px 0" }}>≡ƒôª {h.items}</span>
                            <span style={{ fontSize: "11px", color: "#888", display: "block" }}>ΓÜÖ∩╕Å Add-ons: {h.customization}</span>
                            <span style={{ fontSize: "11px", color: "#888", display: "block" }}>≡ƒÅó Desk: {h.office}</span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <span style={{ fontSize: "10.5px", background: h.status === "Delivered" ? "rgba(39, 174, 96, 0.1)" : "rgba(231, 76, 60, 0.1)", color: h.status === "Delivered" ? "#27ae60" : "#e74c3c", padding: "4px 8px", borderRadius: "6px", fontWeight: "bold", marginRight: "6px" }}>
                                ΓùÅ {h.status}
                              </span>
                              <strong style={{ fontSize: "14px", color: "#2c1b0d" }}>{h.total}</strong>
                            </div>

                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                type="button"
                                onClick={() => setActiveInvoice(h)}
                                style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.1)", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}
                              >
                                Print Invoice
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setToastMsg(`≡ƒöä Re-opened order ${h.id} as active brewing request!`);
                                  setTimeout(() => setToastMsg(""), 3000);
                                }}
                                style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                              >
                                Re-open
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* LIST VIEW MODE */
                    <div style={{ background: "#ffffff", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ background: "#fbf9f6", borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: "11px", textTransform: "uppercase", color: "#666" }}>
                            <th style={{ padding: "16px" }}>Order ID</th>
                            <th style={{ padding: "16px" }}>Customer</th>
                            <th style={{ padding: "16px" }}>Items & Details</th>
                            <th style={{ padding: "16px" }}>Desk</th>
                            <th style={{ padding: "16px" }}>Date</th>
                            <th style={{ padding: "16px" }}>Total</th>
                            <th style={{ padding: "16px" }}>Status</th>
                            <th style={{ padding: "16px", textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHistory.map((h, i) => (
                            <tr key={i} style={{ borderBottom: i === filteredHistory.length - 1 ? "none" : "1px solid rgba(0,0,0,0.04)", fontSize: "12.5px" }}>
                              <td style={{ padding: "16px", fontWeight: "bold", color: "#8a583c" }}>{h.id}</td>
                              <td style={{ padding: "16px", fontWeight: "bold" }}>{h.customer}</td>
                              <td style={{ padding: "16px" }}>
                                <span style={{ display: "block" }}>{h.items}</span>
                                <span style={{ fontSize: "10px", color: "#888" }}>{h.customization}</span>
                              </td>
                              <td style={{ padding: "16px", color: "#555" }}>{h.office}</td>
                              <td style={{ padding: "16px", color: "#777" }}>{h.date}</td>
                              <td style={{ padding: "16px", fontWeight: "bold", color: "#2c1b0d" }}>{h.total}</td>
                              <td style={{ padding: "16px" }}>
                                <span style={{ fontSize: "10px", background: h.status === "Delivered" ? "rgba(39, 174, 96, 0.1)" : "rgba(231, 76, 60, 0.1)", color: h.status === "Delivered" ? "#27ae60" : "#e74c3c", padding: "4px 8px", borderRadius: "6px", fontWeight: "bold" }}>
                                  {h.status}
                                </span>
                              </td>
                              <td style={{ padding: "16px", textAlign: "right" }}>
                                <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                  <button
                                    type="button"
                                    onClick={() => setActiveInvoice(h)}
                                    style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.1)", padding: "4px 8px", borderRadius: "4px", fontSize: "10.5px", cursor: "pointer" }}
                                  >
                                    Print
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setToastMsg(`≡ƒöä Re-opened order ${h.id}...`);
                                      setTimeout(() => setToastMsg(""), 3000);
                                    }}
                                    style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10.5px", cursor: "pointer" }}
                                  >
                                    Re-open
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              );
            })()}

            {activeTab === "menu" && (
              <div className="tab-body-wrapper">
                {toastMsg && (
                  <div style={{ position: "fixed", top: "24px", right: "24px", background: "#2c1b0d", color: "#fdf5e9", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 9999, fontWeight: "bold", borderLeft: "4px solid #e74c3c", display: "flex", gap: "10px", alignItems: "center" }}>
                    <span>≡ƒÜ¿</span> {toastMsg}
                  </div>
                )}

                {/* Advanced Menu Sub-Tabs */}
                <div style={{ display: "flex", gap: "12px", borderBottom: "2px solid rgba(44,27,13,0.06)", paddingBottom: "12px", marginBottom: "28px" }}>
                  {[
                    { id: "live", label: "≡ƒô▒ Today's Live Menu" },
                    { id: "catalog", label: "≡ƒôï Base Catalog Setup" },
                    { id: "schedule", label: "≡ƒôà Schedule & Slots" },
                    { id: "combos", label: "≡ƒî╛ Combos & Seasonal" },
                    { id: "addons", label: "Γ₧ò Add-ons Catalog" }
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setMenuSubTab(sub.id)}
                      style={{
                        padding: "8px 16px",
                        border: "none",
                        background: menuSubTab === sub.id ? "#2c1b0d" : "transparent",
                        color: menuSubTab === sub.id ? "#ffffff" : "#2c1b0d",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        fontSize: "12.5px",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* SUBTAB 1: TODAY'S LIVE MENU */}
                {menuSubTab === "live" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "28px" }}>
                    <div>
                      <h3 className="section-title">Today's Quick Toggles & Overrides</h3>
                      <p style={{ fontSize: "12px", color: "#666", marginTop: "-12px", marginBottom: "20px" }}>Changes made here instantly update the user homepage without editing catalog details.</p>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {menuItems.map((m, i) => {
                          // Check if any linked ingredient has low stock
                          const isLowStock = stocks.some(st => m.linkedIngredients?.includes(st.name) && st.level !== "In Stock");
                          return (
                            <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "20px", display: "flex", gap: "16px", alignItems: "center" }}>
                              <img src={m.image} alt={m.name} style={{ width: "68px", height: "68px", borderRadius: "12px", objectFit: "cover" }} />
                              
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                  <h4 style={{ fontSize: "14.5px", margin: 0, fontWeight: "bold" }}>
                                    {m.name} {m.isSpecial && <span style={{ fontSize: "10px", background: "rgba(241,196,15,0.2)", color: "#d35400", padding: "2px 6px", borderRadius: "4px", marginLeft: "6px" }}>Γÿà Special</span>}
                                  </h4>
                                  <strong style={{ fontSize: "14.5px" }}>Γé╣{m.price}</strong>
                                </div>
                                <p style={{ fontSize: "11.5px", color: "#777", margin: "0 0 10px" }}>{m.desc}</p>
                                
                                {isLowStock && (
                                  <div style={{ fontSize: "11px", color: "#e74c3c", fontWeight: "bold", background: "rgba(231,76,60,0.08)", padding: "4px 8px", borderRadius: "4px", marginBottom: "10px", display: "inline-block" }}>
                                    ΓÜá∩╕Å linked stock is low! "Hurry, only few left" warning banner active.
                                  </div>
                                )}

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMenuAvailability(i)}
                                    style={{ border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer", background: m.active ? "rgba(39, 174, 96, 0.12)" : "rgba(0,0,0,0.05)", color: m.active ? "#27ae60" : "#777" }}
                                  >
                                    {m.active ? "≡ƒƒó Live on App" : "≡ƒö┤ Hidden from Users"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMenuItems(prev => prev.map((item, idx) => idx === i ? { ...item, isSpecial: !item.isSpecial } : item));
                                      setToastMsg(m.isSpecial ? `Removed today's special tag` : `Tagged ${m.name} as today's special!`);
                                      setTimeout(() => setToastMsg(""), 3000);
                                    }}
                                    style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.1)", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}
                                  >
                                    {m.isSpecial ? "Γÿà Unmark Special" : "Γÿà Mark Special"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Preview Widget */}
                    <div>
                      <h3 className="section-title">≡ƒô▒ User Screen Live Preview</h3>
                      <div style={{ background: "#ffffff", padding: "24px", borderRadius: "24px", border: "1.5px solid #2c1b0d", minHeight: "350px", position: "relative" }}>
                        <div style={{ background: "#2c1b0d", color: "#fff", padding: "10px", textAlign: "center", borderRadius: "10px 10px 0 0", margin: "-24px -24px 20px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "bold" }}>Preview: CHAI HEROES APP</span>
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {menuItems.filter(m => m.active).map((m, i) => (
                            <div key={i} style={{ display: "flex", gap: "10px", borderBottom: "1px solid #f2eee9", paddingBottom: "10px" }}>
                              <img src={m.image} alt={m.name} style={{ width: "45px", height: "45px", borderRadius: "8px", objectFit: "cover" }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <strong style={{ fontSize: "12px" }}>{m.name}</strong>
                                  <span style={{ fontSize: "12px", fontWeight: "bold" }}>Γé╣{m.price}</span>
                                </div>
                                <span style={{ fontSize: "10px", color: "#777", display: "block" }}>{m.desc.slice(0, 45)}...</span>
                                {m.isSpecial && <span style={{ fontSize: "8px", background: "#f1c40f", color: "#2c1b0d", padding: "1px 4px", borderRadius: "3px", fontWeight: "bold", display: "inline-block", marginTop: "2px" }}>Today's Special</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 2: BASE CATALOG SETUP */}
                {menuSubTab === "catalog" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
                    <div>
                      <h3 className="section-title">Base Catalog Configuration</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {menuItems.map((m, i) => (
                          <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                              <strong style={{ fontSize: "15px" }}>{m.name}</strong>
                              <span style={{ fontSize: "10px", background: "rgba(39, 174, 96, 0.1)", color: "#27ae60", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                {m.approvalStatus}
                              </span>
                            </div>
                            <p style={{ fontSize: "11.5px", color: "#666", margin: "0 0 10px" }}>{m.desc}</p>
                            
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", fontSize: "11px", color: "#555", borderTop: "1px solid #f2eee9", paddingTop: "10px", marginBottom: "12px" }}>
                              <span>≡ƒôé Cat: <strong>{m.category}</strong></span>
                              <span>ΓÅ▒∩╕Å Prep: <strong>{m.prepTime}</strong></span>
                              <span>≡ƒÑñ Unit: <strong>{m.unit}</strong></span>
                              <span>≡ƒƒó Type: <strong>{m.veg ? "Veg" : "Non-Veg"}</strong></span>
                              <span>≡ƒôª Limits: <strong>Min {m.minQty} - Max {m.maxQty}</strong></span>
                              <span>≡ƒöù stock ingredients: <strong>{m.linkedIngredients?.join(", ") || "None"}</strong></span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const name = prompt("Change name of catalog item:", m.name);
                                  const price = prompt("Change price of catalog item:", m.price);
                                  if (name && price) {
                                    setMenuItems(prev => prev.map((item, idx) => idx === i ? { ...item, name, price: parseFloat(price) || item.price } : item));
                                    setToastMsg(`Updated "${name}" catalog details!`);
                                    setTimeout(() => setToastMsg(""), 3000);
                                  }
                                }}
                                style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.1)", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}
                              >
                                Edit Catalog details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add Item form */}
                    <div>
                      <h3 className="section-title">Create & Register Item</h3>
                      <form onSubmit={handleAddNewMenuItem} style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                        
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Item Name</label>
                          <input type="text" value={newMenuItemName} onChange={(e) => setNewMenuItemName(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>

                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Price (INR)</label>
                          <input type="number" value={newMenuItemPrice} onChange={(e) => setNewMenuItemPrice(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                          <div className="form-group">
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Category</label>
                            <select value={newMenuCategory} onChange={(e) => setNewMenuCategory(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "12.5px" }}>
                              <option value="Chai">Chai</option>
                              <option value="Coffee">Coffee</option>
                              <option value="Namkeen">Namkeen</option>
                              <option value="Biscuits">Biscuits</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Serving Unit</label>
                            <select value={newMenuUnit} onChange={(e) => setNewMenuUnit(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "12.5px" }}>
                              <option value="Cup">Cup</option>
                              <option value="Kulhad">Kulhad</option>
                              <option value="Pack">Pack</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                          <div className="form-group">
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Prep Time (batch)</label>
                            <input type="text" value={newMenuPrepTime} onChange={(e) => setNewMenuPrepTime(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                          </div>
                          <div className="form-group">
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Veg / Non-Veg</label>
                            <select value={newMenuVeg ? "veg" : "nonveg"} onChange={(e) => setNewMenuVeg(e.target.value === "veg")} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "12.5px" }}>
                              <option value="veg">≡ƒƒó Veg</option>
                              <option value="nonveg">≡ƒö┤ Non-Veg</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                          <div className="form-group">
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Min Order Qty</label>
                            <input type="number" value={newMenuMinQty} onChange={(e) => setNewMenuMinQty(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                          </div>
                          <div className="form-group">
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Max Order Qty</label>
                            <input type="number" value={newMenuMaxQty} onChange={(e) => setNewMenuMaxQty(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Image URL</label>
                          <input type="text" value={newMenuItemImg} onChange={(e) => setNewMenuItemImg(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Description</label>
                          <textarea rows="2" value={newMenuItemDesc} onChange={(e) => setNewMenuItemDesc(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px", resize: "none" }} />
                        </div>

                        <button type="submit" style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
                          SEND REGISTER ITEM REQUEST
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* SUBTAB 3: SCHEDULES & SLOTS */}
                {menuSubTab === "schedule" && (
                  <div style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                    <h3 className="section-title" style={{ marginTop: 0 }}>Recurring Weekly Availability & Time Slots</h3>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {menuItems.map((m, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f2eee9", paddingBottom: "12px" }}>
                          <div>
                            <strong>{m.name}</strong>
                            <span style={{ display: "block", fontSize: "11px", color: "#888" }}>Current Time-slot: <strong>{m.timeSlot || "All Day"}</strong></span>
                          </div>
                          
                          {/* Day selection badges */}
                          <div style={{ display: "flex", gap: "6px" }}>
                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => {
                              const active = m.scheduleDays?.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    const nextDays = active
                                      ? m.scheduleDays.filter(d => d !== day)
                                      : [...(m.scheduleDays || []), day];
                                    setMenuItems(prev => prev.map((item, i) => i === idx ? { ...item, scheduleDays: nextDays } : item));
                                  }}
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: "10.5px",
                                    border: "none",
                                    borderRadius: "4px",
                                    background: active ? "rgba(44,27,13,0.12)" : "rgba(0,0,0,0.04)",
                                    color: active ? "#2c1b0d" : "#777",
                                    fontWeight: "bold",
                                    cursor: "pointer"
                                  }}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>

                          {/* Time slot change selector */}
                          <select
                            value={m.timeSlot || "All Day"}
                            onChange={(e) => {
                              const slot = e.target.value;
                              setMenuItems(prev => prev.map((item, i) => i === idx ? { ...item, timeSlot: slot } : item));
                            }}
                            style={{ padding: "6px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "11.5px" }}
                          >
                            <option value="All Day">ΓÿÇ∩╕Å All Day</option>
                            <option value="Morning Only">≡ƒîà Morning Only</option>
                            <option value="Evening Only">≡ƒîç Evening Only</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SUBTAB 4: COMBOS & SEASONAL SETUP */}
                {menuSubTab === "combos" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
                    <div>
                      <h3 className="section-title">Active Combos & Pairings</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "28px" }}>
                        {combos.map((c, i) => (
                          <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "18px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                              <strong style={{ fontSize: "14px", color: "#2c1b0d" }}>{c.name}</strong>
                              <strong style={{ fontSize: "14px", color: "#8a583c" }}>Γé╣{c.price}</strong>
                            </div>
                            <span style={{ fontSize: "11.5px", color: "#666", display: "block", marginBottom: "10px" }}>≡ƒôª Combo items: {c.items}</span>
                            <p style={{ fontSize: "11px", color: "#888", margin: "0 0 10px", fontStyle: "italic" }}>{c.desc}</p>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setCombos(prev => prev.map((cb, idx) => idx === i ? { ...cb, active: !cb.active } : cb));
                              }}
                              style={{ border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10.5px", fontWeight: "bold", cursor: "pointer", background: c.active ? "rgba(39, 174, 96, 0.1)" : "#f0f0f0", color: c.active ? "#27ae60" : "#777" }}
                            >
                              {c.active ? "Active" : "Paused"}
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Auto-suggest rules */}
                      <h3 className="section-title">≡ƒÆí Auto-Suggest Pairings Rules</h3>
                      <div style={{ background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                        <div style={{ fontSize: "12px", borderBottom: "1px solid #f2eee9", paddingBottom: "8px", marginBottom: "8px" }}>
                          <span>When user selects <strong>Classic Masala Chai</strong> Γ₧ö Auto suggest: <strong>Almond Cookies</strong></span>
                        </div>
                        <div style={{ fontSize: "12px", borderBottom: "1px solid #f2eee9", paddingBottom: "8px", marginBottom: "8px" }}>
                          <span>When user selects <strong>Saffron Royal Chai</strong> Γ₧ö Auto suggest: <strong>Saffron Biscuits</strong></span>
                        </div>
                        <div style={{ fontSize: "12px" }}>
                          <span>When user selects <strong>Kashmiri Kahwa</strong> Γ₧ö Auto suggest: <strong>Almond Slivers Add-on</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* New Combo builder Form */}
                    <div>
                      <h3 className="section-title">Create Custom Combo</h3>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const name = e.target.comboName.value;
                          const price = e.target.comboPrice.value;
                          const baseItems = e.target.comboItems.value;
                          if (!name || !price || !baseItems) return;
                          
                          // Append selected addons
                          let finalItems = baseItems;
                          if (selectedComboAddons.length > 0) {
                            finalItems += " + " + selectedComboAddons.join(" + ");
                          }

                          setCombos(prev => [...prev, { name, price: parseFloat(price), items: finalItems, active: true, desc: "Special package rate." }]);
                          e.target.reset();
                          setSelectedComboAddons([]);
                          setToastMsg("≡ƒî▒ Successfully published new combo!");
                          setTimeout(() => setToastMsg(""), 3500);
                        }}
                        style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)", marginBottom: "28px" }}
                      >
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Combo Name</label>
                          <input name="comboName" type="text" placeholder="e.g. Snack Combo" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Combo Price (INR)</label>
                          <input name="comboPrice" type="number" placeholder="e.g. 199" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Included Base Items</label>
                          <input name="comboItems" type="text" placeholder="e.g. Ginger Chai + Biscuits" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        
                        {/* Add-ons Selector */}
                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555", display: "block", marginBottom: "6px" }}>Select Bundle Add-ons</label>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {addonsList.map((ad, idx) => {
                              const checked = selectedComboAddons.includes(ad.name);
                              return (
                                <label key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      if (checked) {
                                        setSelectedComboAddons(prev => prev.filter(n => n !== ad.name));
                                      } else {
                                        setSelectedComboAddons(prev => [...prev, ad.name]);
                                      }
                                    }}
                                  />
                                  <span>{ad.name} (+Γé╣{ad.price})</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <button type="submit" style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
                          CREATE & REGISTER COMBO
                        </button>
                      </form>

                      {/* Seasonal / Festive settings */}
                      <h3 className="section-title">≡ƒìé Seasonal Menu Settings</h3>
                      <div style={{ background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                        <span style={{ fontSize: "11px", color: "#8a583c", fontWeight: "bold", display: "block", marginBottom: "10px" }}>WINTER LIMITED EDITION</span>
                        <div style={{ fontSize: "11.5px", color: "#555" }}>
                          <p>Item: <strong>Kesar Chai Special</strong></p>
                          <p>Active period: <strong>Nov 15 - Feb 15</strong></p>
                          <span style={{ fontSize: "10px", color: "#27ae60", background: "rgba(39,174,96,0.1)", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>ΓùÅ Auto-Schedule Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 5: ADD-ONS CATALOG */}
                {menuSubTab === "addons" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
                    <div>
                      <h3 className="section-title">Add-ons Catalog Setup</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {addonsList.map((ad, i) => (
                          <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "18px", display: "flex", gap: "16px", alignItems: "center" }}>
                            <img src={ad.image || "/chai-ingredients.png"} alt={ad.name} style={{ width: "50px", height: "50px", borderRadius: "8px", objectFit: "cover" }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <strong style={{ fontSize: "13.5px" }}>{ad.name}</strong>
                                <strong style={{ fontSize: "13.5px", color: "#2c1b0d" }}>Γé╣{ad.price}</strong>
                              </div>
                              <p style={{ fontSize: "11px", color: "#777", margin: "4px 0 8px" }}>{ad.desc}</p>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setAddonsList(prev => prev.map((item, idx) => idx === i ? { ...item, active: !item.active } : item));
                                }}
                                style={{ border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", cursor: "pointer", background: ad.active ? "rgba(39, 174, 96, 0.1)" : "#f0f0f0", color: ad.active ? "#27ae60" : "#777" }}
                              >
                                {ad.active ? "≡ƒƒó Available" : "≡ƒö┤ Paused"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add new addon Form */}
                    <div>
                      <h3 className="section-title">Create Custom Add-on</h3>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newAddonName || !newAddonPrice) return;
                          const newAdd = {
                            name: newAddonName,
                            price: parseFloat(newAddonPrice) || 0,
                            desc: newAddonDesc || "Fresh add-on suggestion.",
                            image: newAddonImg || "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
                            active: true
                          };
                          setAddonsList(prev => [...prev, newAdd]);
                          setNewAddonName("");
                          setNewAddonPrice("");
                          setNewAddonDesc("");
                          setNewAddonImg("");
                          setToastMsg(`≡ƒî▒ Added add-on "${newAddonName}" successfully!`);
                          setTimeout(() => setToastMsg(""), 3000);
                        }}
                        style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}
                      >
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Add-on Name</label>
                          <input type="text" value={newAddonName} onChange={(e) => setNewAddonName(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Add-on Price (INR)</label>
                          <input type="number" value={newAddonPrice} onChange={(e) => setNewAddonPrice(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Image Link URL</label>
                          <input type="text" value={newAddonImg} onChange={(e) => setNewAddonImg(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Short Description</label>
                          <textarea rows="2" value={newAddonDesc} onChange={(e) => setNewAddonDesc(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px", resize: "none" }} />
                        </div>
                        <button type="submit" style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
                          PUBLISH ADD-ON
                        </button>
                      </form>
                    </div>
                  </div>
                )}

              </div>
            )}

            {activeTab === "subs" && (() => {
              // Mock active subscriptions with details
              const activeSubs = [
                {
                  id: "SUB-801",
                  customer: "Rohan Varma",
                  office: "Innovate Labs, Room 402, Floor 4",
                  items: "2x Classic Masala Chai, 1x Cookie",
                  schedule: "Mon-Sat (Daily)",
                  timeSlot: "09:00 AM",
                  startDate: "01/06/2026",
                  status: "Active"
                },
                {
                  id: "SUB-802",
                  customer: "Meera Joshi",
                  office: "Pulse Ventures, Room 512, Floor 5",
                  items: "1x Ginger Chai",
                  schedule: "Mon-Wed-Fri",
                  timeSlot: "11:30 AM",
                  startDate: "15/06/2026",
                  status: "Active"
                },
                {
                  id: "SUB-803",
                  customer: "Abhishek Sen",
                  office: "NextGen Software, Room 301, Floor 3",
                  items: "3x Saffron Royal Chai, 3x Almond Biscuits",
                  schedule: "Mon-Sat (Daily)",
                  timeSlot: "04:30 PM",
                  startDate: "20/06/2026",
                  status: "Active"
                },
                {
                  id: "SUB-804",
                  customer: "Sneha Reddy",
                  office: "Alpha Capital, Room 508, Floor 5",
                  items: "2x Kashmiri Kahwa",
                  schedule: "Daily",
                  timeSlot: "10:00 AM",
                  startDate: "28/06/2026",
                  status: "Paused"
                }
              ];