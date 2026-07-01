export const glanceReportHandler = async (data: any) => {
  const jobWiseData: any[] = [];
  
  const globalDeliveryItems: any[] = [];
  const globalWorkOrderQty: Record<string, number> = {};
  const globalTotalByDeliveryType: Record<string, number> = {};
  
  // 🚀 NEW: Global Composition Tracker
  const globalCompositions: Record<string, { workOrderQty: number, deliveryQty: number }> = {};
  
  let globalWorkOrderTotal = 0;
  let globalDeliveryTotal = 0;

  const jobs = data?.data || data;

  if (!Array.isArray(jobs)) {
    return { jobs: [], global: {} };
  }

  for (const job of jobs) {
    if (!job.workOrders || job.workOrders.length === 0) {
      continue; 
    }

    const jobNo = job.jobNo;
    const jobId = job.id;

    // Job-specific trackers
    const jobWorkOrderQty: Record<string, number> = {};
    const jobDeliveryItems: any[] = [];
    const jobTotalByDeliveryType: Record<string, number> = {};
    
    // 🚀 NEW: Job Composition Tracker
    const jobCompositions: Record<string, { workOrderQty: number, deliveryQty: number }> = {};
    
    let jobWorkOrderTotal = 0;
    let jobDeliveryTotal = 0;

    for (const workOrder of job.workOrders) {
      const orderType = workOrder.orderType;
      if (!orderType) continue;

      if (!jobWorkOrderQty[orderType]) jobWorkOrderQty[orderType] = 0;
      if (!globalWorkOrderQty[orderType]) globalWorkOrderQty[orderType] = 0;

      for (const composition of workOrder.compositions || []) {
        const compName = composition.composition || 'Unknown Composition';
        
        // Initialize composition trackers
        if (!jobCompositions[compName]) jobCompositions[compName] = { workOrderQty: 0, deliveryQty: 0 };
        if (!globalCompositions[compName]) globalCompositions[compName] = { workOrderQty: 0, deliveryQty: 0 };

        // 1. Sum workOrderQty
        const wQty = composition.workOrderQty || 0;
        
        jobWorkOrderQty[orderType] += wQty;
        globalWorkOrderQty[orderType] += wQty;
        jobWorkOrderTotal += wQty;
        globalWorkOrderTotal += wQty;

        // 🚀 Add to Composition Work Order Qty
        jobCompositions[compName].workOrderQty += wQty;
        globalCompositions[compName].workOrderQty += wQty;

        // 2. Process deliveries
        for (const delivery of composition.deliveries || []) {
          const dType = delivery.deliveryType ? delivery.deliveryType.replace(/\s+/g, '') : '';
          const toFactory = delivery.toFactory;
          const fromFactory = delivery.fromFactory;
          const dQty = delivery.deliveryQty || 0;
          
          if (dType && toFactory && fromFactory) {
            let jobItem = jobDeliveryItems.find(
              i => i.deliveryType === dType && i.toFactory === toFactory && i.fromFactory === fromFactory
            );
            if (jobItem) {
              jobItem.qty += dQty;
            } else {
              jobDeliveryItems.push({ deliveryType: dType, toFactory, fromFactory, qty: dQty });
            }

            let globalItem = globalDeliveryItems.find(
              i => i.deliveryType === dType && i.toFactory === toFactory && i.fromFactory === fromFactory
            );
            if (globalItem) {
              globalItem.qty += dQty;
            } else {
              globalDeliveryItems.push({ deliveryType: dType, toFactory, fromFactory, qty: dQty });
            }

            // --- Total by Delivery Type ---
            if (!jobTotalByDeliveryType[dType]) jobTotalByDeliveryType[dType] = 0;
            jobTotalByDeliveryType[dType] += dQty;

            if (!globalTotalByDeliveryType[dType]) globalTotalByDeliveryType[dType] = 0;
            globalTotalByDeliveryType[dType] += dQty;

            // --- Grand Totals ---
            jobDeliveryTotal += dQty;
            globalDeliveryTotal += dQty;

            // 🚀 Add to Composition Delivery Qty
            jobCompositions[compName].deliveryQty += dQty;
            globalCompositions[compName].deliveryQty += dQty;
          }
        }
      }
    }

    // Format job compositions into an array for easier UI rendering
    const jobCompositionsArray = Object.keys(jobCompositions).map(name => ({
      composition: name,
      ...jobCompositions[name]
    }));

    // Push the job-wise summary to the array
    jobWiseData.push({
      jobId,
      jobNo,
      workOrderQty: {
        ...jobWorkOrderQty,
        total: jobWorkOrderTotal
      },
      deliveryQty: {
        items: jobDeliveryItems, 
        totalByDeliveryType: jobTotalByDeliveryType, 
        total: jobDeliveryTotal
      },
      compositions: jobCompositionsArray // <--- 🚀 NEW
    });
  }

  // Format global compositions into an array
  const globalCompositionsArray = Object.keys(globalCompositions).map(name => ({
    composition: name,
    ...globalCompositions[name]
  }));

  return {
    jobs: jobWiseData,
    global: {
      workOrderQty: {
        ...globalWorkOrderQty,
        total: globalWorkOrderTotal
      },
      deliveryQty: {
        items: globalDeliveryItems,
        totalByDeliveryType: globalTotalByDeliveryType, 
        total: globalDeliveryTotal
      },
      compositions: globalCompositionsArray // <--- 🚀 NEW
    }
  };
};