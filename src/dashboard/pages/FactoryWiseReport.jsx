import DashboardLayout from "../../components/DashboardLayout";

const FactoryWiseReport = () => {
    return (
        <div>
                <div className="p-6 h-screen">
                    <div className="w-full h-full overflow-auto bg-white shadow-lg border border-gray-300">

                        <table className="min-w-[2200px] border-collapse text-base">

                            {/* HEADER */}
                            <thead>
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
                                            className="sticky top-0 z-30 bg-gray-200 border border-gray-400 px-6 py-4 whitespace-nowrap font-semibold"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>

                                {/* Example Group Row */}
                                <tr className="hover:bg-gray-50">
                                    <td
                                        rowSpan="3"
                                        className="border border-gray-300 px-6 py-4 align-middle font-semibold bg-gray-50"
                                    >
                                        M&M YARN DYED MILLS LTD
                                    </td>

                                    <td
                                        rowSpan="3"
                                        className="border border-gray-300 px-6 py-4 align-middle"
                                    >
                                        SM26-3795/FEB
                                    </td>

                                    <td className="border border-gray-300 px-6 py-4">BLACK</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">476.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">155</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">150</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-5</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">149</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">147</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">146</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-3</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">2%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">72,230</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">50,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">22,230</td>
                                </tr>

                                <tr className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-6 py-4">WHITE</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">580.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">60</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">58</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-2</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">57</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">56</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">55</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-1</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">1%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">32,040</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">20,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">12,040</td>
                                </tr>

                                <tr className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-6 py-4">BLUE</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">337.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">125</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">120</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-5</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">118</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">117</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">115</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-2</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">1.2%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">42,125</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">30,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">12,125</td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td
                                        rowSpan="3"
                                        className="border border-gray-300 px-6 py-4 align-middle font-semibold bg-gray-50"
                                    >
                                        M&M YARN DYED MILLS LTD
                                    </td>

                                    <td
                                        rowSpan="3"
                                        className="border border-gray-300 px-6 py-4 align-middle"
                                    >
                                        SM26-3795/FEB
                                    </td>

                                    <td className="border border-gray-300 px-6 py-4">BLACK</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">476.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">155</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">150</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-5</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">149</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">147</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">146</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-3</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">2%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">72,230</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">50,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">22,230</td>
                                </tr>

                                <tr className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-6 py-4">WHITE</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">580.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">60</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">58</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-2</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">57</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">56</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">55</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-1</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">1%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">32,040</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">20,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">12,040</td>
                                </tr>

                                <tr className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-6 py-4">BLUE</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">337.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">125</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">120</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-5</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">118</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">117</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">115</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-2</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">1.2%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">42,125</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">30,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">12,125</td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td
                                        rowSpan="3"
                                        className="border border-gray-300 px-6 py-4 align-middle font-semibold bg-gray-50"
                                    >
                                        M&M YARN DYED MILLS LTD
                                    </td>

                                    <td
                                        rowSpan="3"
                                        className="border border-gray-300 px-6 py-4 align-middle"
                                    >
                                        SM26-3795/FEB
                                    </td>

                                    <td className="border border-gray-300 px-6 py-4">BLACK</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">476.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">155</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">150</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-5</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">149</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">147</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">146</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-3</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">2%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">72,230</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">50,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">22,230</td>
                                </tr>

                                <tr className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-6 py-4">WHITE</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">580.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">60</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">58</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-2</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">57</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">56</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">55</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-1</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">1%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">32,040</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">20,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">12,040</td>
                                </tr>

                                <tr className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-6 py-4">BLUE</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">337.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">125</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">120</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-5</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">118</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">117</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">115</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-2</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">1.2%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">42,125</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">30,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">12,125</td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td
                                        rowSpan="3"
                                        className="border border-gray-300 px-6 py-4 align-middle font-semibold bg-gray-50"
                                    >
                                        M&M YARN DYED MILLS LTD
                                    </td>

                                    <td
                                        rowSpan="3"
                                        className="border border-gray-300 px-6 py-4 align-middle"
                                    >
                                        SM26-3795/FEB
                                    </td>

                                    <td className="border border-gray-300 px-6 py-4">BLACK</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">476.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">155</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">150</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-5</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">149</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">147</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">146</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-3</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">2%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">72,230</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">50,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">22,230</td>
                                </tr>

                                <tr className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-6 py-4">WHITE</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">580.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">60</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">58</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-2</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">57</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">56</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">55</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-1</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">1%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">32,040</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">20,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">12,040</td>
                                </tr>

                                <tr className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-6 py-4">BLUE</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">337.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">125</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">120</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-5</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">118</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">117</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">115</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-2</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">1.2%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">42,125</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">30,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">12,125</td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td
                                        rowSpan="3"
                                        className="border border-gray-300 px-6 py-4 align-middle font-semibold bg-gray-50"
                                    >
                                        M&M YARN DYED MILLS LTD
                                    </td>

                                    <td
                                        rowSpan="3"
                                        className="border border-gray-300 px-6 py-4 align-middle"
                                    >
                                        SM26-3795/FEB
                                    </td>

                                    <td className="border border-gray-300 px-6 py-4">BLACK</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">476.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">155</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">150</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-5</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">149</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">147</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">146</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-3</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">2%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">72,230</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">50,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">22,230</td>
                                </tr>

                                <tr className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-6 py-4">WHITE</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">580.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">60</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">58</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-2</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">57</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">56</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">55</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-1</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">1%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">32,040</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">20,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">12,040</td>
                                </tr>

                                <tr className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-6 py-4">BLUE</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">337.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">125</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">120</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-5</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">118</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">117</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">115</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-2</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">1.2%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">42,125</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">30,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">12,125</td>
                                </tr>
                                <tr className="hover:bg-gray-50">
                                    <td
                                        rowSpan="3"
                                        className="border border-gray-300 px-6 py-4 align-middle font-semibold bg-gray-50"
                                    >
                                        M&M YARN DYED MILLS LTD
                                    </td>

                                    <td
                                        rowSpan="3"
                                        className="border border-gray-300 px-6 py-4 align-middle"
                                    >
                                        SM26-3795/FEB
                                    </td>

                                    <td className="border border-gray-300 px-6 py-4">BLACK</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">476.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">155</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">150</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-5</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">149</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">147</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">146</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-3</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">2%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">72,230</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">50,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">22,230</td>
                                </tr>

                                <tr className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-6 py-4">WHITE</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">580.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">60</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">58</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-2</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">57</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">56</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">55</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-1</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">1%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">32,040</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">20,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">12,040</td>
                                </tr>

                                <tr className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-6 py-4">BLUE</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">337.00</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">125</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">120</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-5</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">118</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">117</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">115</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-500 text-right">-2</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">1.2%</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right font-semibold">42,125</td>
                                    <td className="border border-gray-300 px-6 py-4 text-right">30,000</td>
                                    <td className="border border-gray-300 px-6 py-4 text-red-600 font-semibold text-right">12,125</td>
                                </tr>

                            </tbody>
                        </table>
                    </div>
                </div>


        </div>
    );
};

export default FactoryWiseReport;