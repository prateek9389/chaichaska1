const fs = require('fs');

function updateChaimaker() {
    const path = 'C:/Users/prate/Desktop/Chai chuska (3)/Chai chuska/chai/app/chaimaker/page.js';
    let content = fs.readFileSync(path, 'utf8');

    // 1. Update imports
    content = content.replace('getRestockRequests,', 'onRestockRequestsSnapshot, getRestockRequests,');

    // 2. Remove manual state update
    content = content.replace('setRestockRequests((prev) => [{ ...newReq, id, createdAt: Date.now() }, ...prev]);', '');

    // 3. Update useEffect
    const targetEffect = `    getRestockRequests().then(setRestockRequests);
    return () => unsubOrders();`;
    const replacementEffect = `    const unsubRestock = onRestockRequestsSnapshot(setRestockRequests);
    return () => {
      unsubOrders();
      unsubRestock();
    };`;
    content = content.replace(targetEffect, replacementEffect);

    fs.writeFileSync(path, content);
}

function updateAdmin() {
    const path = 'C:/Users/prate/Desktop/Chai chuska (3)/Chai chuska/chai/app/admin/page.js';
    let content = fs.readFileSync(path, 'utf8');

    // 1. Update imports
    content = content.replace('getRestockRequests, getRestockHistory', 'onRestockRequestsSnapshot, getRestockRequests, getRestockHistory');

    // 2. Remove manual state update (admin has a dummy handleRaiseAlert that might still have setRestockRequests)
    content = content.replace('setRestockRequests((prev) => [newReq, ...prev]);', '');

    // 3. Remove setRestockRequests from process update
    content = content.replace('setRestockRequests(prev => prev.map(p => p.id === req.id ? { ...p, status: editStockLevel, adminNote: editStockQty } : p));', '');

    // 4. Update useEffect
    const targetEffect = `    getRestockRequests().then(setRestockRequests);
    getRestockHistory().then(setRestockHistory);
    getLeaveRequests().then(setLeaveRequests);
    getSettings().then(s => {
      if (s) {
        if (s.workingHours) setWorkingHours(s.workingHours);
        if (s.shopName) setShopName(s.shopName);
        if (s.brewmasterName) setBrewmasterName(s.brewmasterName);
        if (s.brewmasterContact) setBrewmasterContact(s.brewmasterContact);
        if (s.brewmasterBio) setBrewmasterBio(s.brewmasterBio);
      }
    });
    return () => unsubOrders();`;
    const replacementEffect = `    const unsubRestock = onRestockRequestsSnapshot(setRestockRequests);
    getRestockHistory().then(setRestockHistory);
    getLeaveRequests().then(setLeaveRequests);
    getSettings().then(s => {
      if (s) {
        if (s.workingHours) setWorkingHours(s.workingHours);
        if (s.shopName) setShopName(s.shopName);
        if (s.brewmasterName) setBrewmasterName(s.brewmasterName);
        if (s.brewmasterContact) setBrewmasterContact(s.brewmasterContact);
        if (s.brewmasterBio) setBrewmasterBio(s.brewmasterBio);
      }
    });
    return () => {
      unsubOrders();
      unsubRestock();
    };`;
    content = content.replace(targetEffect, replacementEffect);

    fs.writeFileSync(path, content);
}

try {
    updateChaimaker();
    updateAdmin();
    console.log("Successfully added real-time listeners for Restock Requests");
} catch(e) {
    console.error(e);
}
