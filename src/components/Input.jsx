const Input = ({ 
    label, 
    name, 
    type = "text", 
    value, 
    onChange, 
    required = false, 
    placeholder = "",
    options = [], // For select dropdown
    className = ""
}) => {
    const baseInputClass = "px-4 py-2.5 border border-gray-200 rounded-md focus:border-primary-500 focus:border-opacity-50 outline-none transition-all w-full";
    
    return (
        <div className={`flex flex-col ${className}`}>
            {label && (
                <label className="text-sm font-medium text-gray-700 mb-2">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            
            {type === "select" ? (
                <div className="relative">
                    <select
                        name={name}
                        value={value}
                        onChange={onChange}
                        required={required}
                        className={`${baseInputClass} bg-white cursor-pointer appearance-none pr-10 text-gray-700`}
                    >
                        <option value="">
                            {placeholder || `Select ${label}`}
                        </option>
                        {options.map((option) => (
                            <option 
                                key={option} 
                                value={option}
                            >
                                {option}
                            </option>
                        ))}
                    </select>
                    {/* Custom dropdown arrow */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                </div>
            ) : (
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    required={required}
                    placeholder={placeholder}
                    className={baseInputClass}
                />
            )}
        </div>
    );
};

export default Input;
