import DashboardLayout from "../../components/DashboardLayout";
import { useParams } from "react-router-dom";

const FactoryWiseReport = () => {
    const { factoryName } = useParams();
    
    return (
        <DashboardLayout title={`Factory Report - ${factoryName}`}>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="table-container overflow-x-auto">
                    <table className="w-full border-collapse factory-table" style={{ minWidth: '1200px' }}>
                        {/* HEADER */}
                        <thead className="bg-gray-50">
                            <tr>
                                {[
                                    "YARN DYED FACTORY NAME",
                                    "JOB NO.",
                                    "YARN DYEING COLOR",
                                    "Y/D PRICE PER KG",
                                    "YARN DYED WORK ORDER (QTY)",
                                    "YARN DELIVERY FOR Y/D",
                                    "DEL. SHORT & EXCESS",
                                    "YARN RETURN RECEIVED",
                                    "GREY RECEIVED FROM Y/D",
                                    "FINISH YARN RECEIVED",
                                    "YARN RCVD SHORT & EXCESS",
                                    "PROCESS LOSS AFTER Y/D",
                                    "PAYABLE AMOUNT",
                                    "PAID BILLING AMOUNT",
                                    "PENDING BILLING AMOUNT",
                                ].map((header, i) => (
                                    <th
                                        key={i}
                                        className="px-3 py-2 text-left font-semibold text-gray-700 text-sm border-b border-gray-200 whitespace-nowrap"
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {/* First Group */}
                            <tr className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                                <td rowSpan="3" className="px-3 py-2 align-middle font-semibold bg-primary-50 text-primary-700 text-sm border-r border-gray-200">
                                    M&M YARN DYED MILLS LTD
                                </td>
                                <td rowSpan="3" className="px-3 py-2 align-middle text-gray-700 text-sm border-r border-gray-200">
                                    SM26-3795/FEB
                                </td>
                                <td className="px-3 py-2 text-gray-700 text-sm border-r border-gray-200">BLACK</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">476.00</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">155</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">150</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-5</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">149</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">147</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">146</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-3</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">2%</td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800 text-sm border-r border-gray-200">72,230</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">50,000</td>
                                <td className="px-3 py-2 text-red-600 font-semibold text-right text-sm">22,230</td>
                            </tr>
                            <tr className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                                <td className="px-3 py-2 text-gray-700 text-sm border-r border-gray-200">WHITE</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">580.00</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">60</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">58</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-2</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">57</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">56</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">55</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-1</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">1%</td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800 text-sm border-r border-gray-200">32,040</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">20,000</td>
                                <td className="px-3 py-2 text-red-600 font-semibold text-right text-sm">12,040</td>
                            </tr>
                            <tr className="hover:bg-gray-50 transition-colors border-b border-gray-200">
                                <td className="px-3 py-2 text-gray-700 text-sm border-r border-gray-200">BLUE</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">337.00</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">125</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">120</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-5</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">118</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">117</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">115</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-2</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">1.2%</td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800 text-sm border-r border-gray-200">42,125</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">30,000</td>
                                <td className="px-3 py-2 text-red-600 font-semibold text-right text-sm">12,125</td>
                            </tr>

                            {/* Second Group */}
                            <tr className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                                <td rowSpan="3" className="px-3 py-2 align-middle font-semibold bg-primary-50 text-primary-700 text-sm border-r border-gray-200">
                                    FASHION KNITWEAR LTD
                                </td>
                                <td rowSpan="3" className="px-3 py-2 align-middle text-gray-700 text-sm border-r border-gray-200">
                                    FK27-4896/MAR
                                </td>
                                <td className="px-3 py-2 text-gray-700 text-sm border-r border-gray-200">BLACK</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">485.00</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">200</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">195</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-5</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">190</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">188</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">185</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-5</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">2.6%</td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800 text-sm border-r border-gray-200">89,725</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">60,000</td>
                                <td className="px-3 py-2 text-red-600 font-semibold text-right text-sm">29,725</td>
                            </tr>
                            <tr className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                                <td className="px-3 py-2 text-gray-700 text-sm border-r border-gray-200">WHITE</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">590.00</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">80</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">78</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-2</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">76</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">75</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">74</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-2</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">1.3%</td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800 text-sm border-r border-gray-200">43,660</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">25,000</td>
                                <td className="px-3 py-2 text-red-600 font-semibold text-right text-sm">18,660</td>
                            </tr>
                            <tr className="hover:bg-gray-50 transition-colors border-b border-gray-200">
                                <td className="px-3 py-2 text-gray-700 text-sm border-r border-gray-200">BLUE</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">345.00</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">150</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">145</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-5</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">142</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">140</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">138</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-4</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">1.4%</td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800 text-sm border-r border-gray-200">47,610</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">35,000</td>
                                <td className="px-3 py-2 text-red-600 font-semibold text-right text-sm">12,610</td>
                            </tr>

                            {/* Third Group */}
                            <tr className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                                <td rowSpan="3" className="px-3 py-2 align-middle font-semibold bg-primary-50 text-primary-700 text-sm border-r border-gray-200">
                                    TEXTILE SOLUTIONS LTD
                                </td>
                                <td rowSpan="3" className="px-3 py-2 align-middle text-gray-700 text-sm border-r border-gray-200">
                                    TS28-5123/APR
                                </td>
                                <td className="px-3 py-2 text-gray-700 text-sm border-r border-gray-200">BLACK</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">495.00</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">180</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">175</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-5</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">172</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">170</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">168</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-4</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">2.3%</td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800 text-sm border-r border-gray-200">83,160</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">55,000</td>
                                <td className="px-3 py-2 text-red-600 font-semibold text-right text-sm">28,160</td>
                            </tr>
                            <tr className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                                <td className="px-3 py-2 text-gray-700 text-sm border-r border-gray-200">WHITE</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">600.00</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">90</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">88</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-2</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">86</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">85</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">84</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-2</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">1.1%</td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800 text-sm border-r border-gray-200">50,400</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">30,000</td>
                                <td className="px-3 py-2 text-red-600 font-semibold text-right text-sm">20,400</td>
                            </tr>
                            <tr className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-2 text-gray-700 text-sm border-r border-gray-200">BLUE</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">355.00</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">110</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">108</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-2</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">106</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">105</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">103</td>
                                <td className="px-3 py-2 text-red-600 text-right text-sm font-medium border-r border-gray-200">-3</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">1.9%</td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-800 text-sm border-r border-gray-200">36,565</td>
                                <td className="px-3 py-2 text-right text-gray-700 text-sm border-r border-gray-200">25,000</td>
                                <td className="px-3 py-2 text-red-600 font-semibold text-right text-sm">11,565</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default FactoryWiseReport;