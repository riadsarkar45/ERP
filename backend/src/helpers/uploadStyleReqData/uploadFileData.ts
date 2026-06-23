export const uploadDataFromFile = async (fileData: any[]) => {
    if (!fileData || !Array.isArray(fileData)) {
        throw new Error("No data provided");
    }

    const groupedData = fileData.reduce((acc: any[], row: any) => {
        const { jobNo, ...compositionDetails } = row;

        const existingJob = acc.find((item) => item.jobNo === jobNo);

        if (existingJob) {
            existingJob.compositions.push(compositionDetails);
        } else {
            acc.push({
                jobNo: jobNo,
                compositions: [compositionDetails],
            });
        }

        return acc;
    }, []); 
    console.log(groupedData);

    // groupedData.forEach(element => {
        
    // });
    return groupedData;
};