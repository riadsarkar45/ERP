import { X, Save, Plus } from 'lucide-react';
import Input from './Input';
import { useState } from 'react';
import { RefreshCcw } from "lucide-react";


const MISGlanceReport = ({ setShowModal }) => {

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fade-in"
            />


            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-white rounded-md border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-hidden pointer-events-auto animate-slide-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold uppercase text-gray-800">New Requirement</h2>
                        <button
                            onClick={() => setShowModal(false)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                </div>
            </div>

            <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
        </>
    );
};

export default MISGlanceReport;