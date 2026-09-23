
export const footerTotals = ({FROZEN_COUNT, filteredData, COLUMNS, getBreakdownValue}) => {
        const totals = {};
        for (let idx = FROZEN_COUNT; idx < COLUMNS.length; idx++) {
            totals[idx] = 0;
        }

        filteredData.forEach(row => {
            const compBreakdown = row.compBreakdown || (row.rows || []).map(() => ({}));
            const numSubRows = (row.rows || []).length;

            for (let j = 0; j < numSubRows; j++) {
                const cell = row.rows[j] || {};
                const cb = compBreakdown[j] || {};

                totals[8] += Number(cell.orderQty) || 0;

                const firstBooking = (Number(cell.finishRequiredQty) * (1 + Number(row.processLoss) / 100) + Number(cell.additional)) || 0;
                totals[9] += firstBooking;
                totals[13] += firstBooking;

                totals[10] += Number(row.processLoss) || 0;

                const lossQty = Number(cell.additional) * (Number(row.processLoss) / 100);
                const netAdditional = Number(cell.additional) - lossQty;
                const finishReqAdj = Number(cell.finishRequiredQty) + netAdditional;
                totals[11] += Number.isFinite(finishReqAdj) ? finishReqAdj : 0;

                totals[12] += Number(cell.additional) || 0;

                if (cb?.status) continue;

                const workOrderQty = getBreakdownValue(cb, 'knittingOrder_workOrderQty');
                totals[14] += workOrderQty;
                totals[15] += firstBooking - workOrderQty;

                const yarnDelivery = getBreakdownValue(cb, 'knittingOrder_Yarn_Delivery');
                totals[16] += yarnDelivery;
                totals[17] += workOrderQty - yarnDelivery;

                totals[18] += getBreakdownValue(cb, 'yarnDyeingOrder_Yarn_Delivery_For_Yarn_Dye');
                totals[19] += getBreakdownValue(cb, 'yarnDyeingOrder_Yarn_Received_From_Yarn_Dye');

                const greyReceived = getBreakdownValue(cb, 'knittingOrder_Grey_Fabric_Received');
                totals[21] += greyReceived;

                const yarnReturn = getBreakdownValue(cb, 'knittingOrder_Yarn_Return');
                totals[22] += yarnReturn;
                totals[23] += (greyReceived + yarnReturn) - yarnDelivery;

                const greyDelivery = getBreakdownValue(cb, 'dyeingOrder_Grey_Delivery');
                totals[24] += greyDelivery;
                totals[25] += getBreakdownValue(cb, 'dyeingOrder_Grey_Return');

                const greyReceivedDyeing = getBreakdownValue(cb, 'dyeingOrder_Grey_Received');
                totals[26] += greyReceivedDyeing;
                totals[27] += getBreakdownValue(cb, 'dyeingOrder_Finish_Received');

                const greyReturnRcvd = getBreakdownValue(cb, 'dyeingOrder_Grey_Return_Received');
                const greyReceivedFromDyeing = getBreakdownValue(cb, 'dyeingOrder_Grey_Received_From_Dyeing');
                const hasGreyData = greyReturnRcvd || greyReceivedFromDyeing || greyDelivery;
                if (hasGreyData) {
                    totals[28] += greyDelivery - greyReceivedDyeing - greyReturnRcvd;
                }

                const aopSent = getBreakdownValue(cb, 'aopOrder_Sent_For_Aop');
                totals[29] += aopSent;
                totals[30] += getBreakdownValue(cb, 'aopOrder_Fabric_Return');
                totals[31] += getBreakdownValue(cb, 'aopOrder_After_Aop_Fabric_Rcvd');

                const aopReceived = getBreakdownValue(cb, 'aopOrder_Received_From_Aop');
                totals[32] += aopReceived;
                totals[33] += aopReceived - aopSent;

                if (aopSent > 0) {
                    totals[34] += ((aopSent - aopReceived) / aopSent) * 100;
                }

                const rpSent = getBreakdownValue(cb, 'reProcessOrder_Sent_for_Re_Process');
                totals[35] += rpSent;
                totals[36] += getBreakdownValue(cb, 'reProcessOrder_Return_Received');

                const rpGrey = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Grey');
                totals[37] += rpGrey;

                const rpFinish = getBreakdownValue(cb, 'reProcessOrder_Received_After_Re_Process_Finish');
                totals[38] += rpFinish;
                totals[39] += (rpGrey + rpFinish) - rpSent;

                if (rpSent > 0) {
                    totals[40] += ((rpSent - (rpGrey + rpFinish)) / rpSent) * 100;
                }
            }
        });

        return totals;
    };