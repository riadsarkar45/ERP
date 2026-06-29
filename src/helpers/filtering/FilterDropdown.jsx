import { useState, useEffect, useRef } from "react";

const FilterDropdown = ({ columnName, uniqueValues, selectedValues, onApply }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempSelected, setTempSelected] = useState(selectedValues || [...uniqueValues]);
    const [searchTerm, setSearchTerm] = useState("");
    const [pos, setPos] = useState({ top: 0, left: 0 });
    
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);

    // Calculate position and reset state when opening
    useEffect(() => {
        if (isOpen) {
            setTempSelected(selectedValues || [...uniqueValues]);
            setSearchTerm("");
            
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                let left = rect.left;
                // Prevent dropdown from going off the right side of the screen
                if (left + 240 > window.innerWidth) {
                    left = window.innerWidth - 250;
                }
                setPos({
                    top: rect.bottom + 4,
                    left: left
                });
            }
        }
    }, [isOpen, selectedValues, uniqueValues]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                buttonRef.current && !buttonRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleSelectAll = () => {
        if (tempSelected.length === uniqueValues.length) {
            setTempSelected([]);
        } else {
            setTempSelected([...uniqueValues]);
        }
    };

    const handleCheckboxChange = (value) => {
        setTempSelected(prev => 
            prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
        );
    };

    const handleApply = () => {
        onApply(columnName, tempSelected);
        setIsOpen(false);
    };

    const handleCancel = () => {
        setIsOpen(false);
    };

    const filteredUniqueValues = uniqueValues.filter(v => 
        String(v).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectAllChecked = tempSelected.length === uniqueValues.length;
    const selectAllIndeterminate = tempSelected.length > 0 && tempSelected.length < uniqueValues.length;
    const hasActiveFilter = selectedValues && selectedValues.length > 0 && selectedValues.length < uniqueValues.length;

    return (
        <div style={{ position: "relative", display: "inline-block", marginLeft: "8px" }}>
            <button 
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    background: "none", border: "none", cursor: "pointer", padding: "2px", 
                    color: hasActiveFilter ? "#2563eb" : "#6b7280", 
                    display: "flex", alignItems: "center", justifyContent: "center" 
                }}
                title="Filter"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={hasActiveFilter ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
            </button>

            {isOpen && (
                <div 
                    ref={dropdownRef}
                    style={{ 
                        position: "fixed", 
                        top: `${pos.top}px`, 
                        left: `${pos.left}px`, 
                        zIndex: 9999, 
                        backgroundColor: "white", 
                        border: "1px solid #d1d5db", 
                        borderRadius: "4px", 
                        boxShadow: "0 4px 12px -1px rgba(0,0,0,0.15)", 
                        width: "240px", 
                        display: "flex", 
                        flexDirection: "column", 
                        fontSize: "13px" 
                    }}
                >
                    {/* 1. Search Box */}
                    <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            style={{ 
                                width: "100%", padding: "6px 8px", border: "1px solid #d1d5db", 
                                borderRadius: "4px", fontSize: "12px", outline: "none", boxSizing: "border-box" 
                            }} 
                            autoFocus
                        />
                    </div>
                    
                    {/* 2. (Select All) Checkbox */}
                    <div style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 500 }}>
                            <input 
                                type="checkbox" 
                                checked={selectAllChecked}
                                ref={el => el && (el.indeterminate = selectAllIndeterminate)}
                                onChange={toggleSelectAll} 
                                style={{ cursor: "pointer" }} 
                            />
                            <span>(Select All)</span>
                        </label>
                    </div>

                    {/* 3. Scrollable List of Values */}
                    <div style={{ overflowY: "auto", padding: "8px", flex: 1, maxHeight: "250px" }}>
                        {filteredUniqueValues.length === 0 ? (
                            <div style={{ color: "#9ca3af", fontSize: "12px", textAlign: "center", padding: "8px 0" }}>No matches</div>
                        ) : (
                            filteredUniqueValues.map((val, idx) => (
                                <label key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", cursor: "pointer" }}>
                                    <input 
                                        type="checkbox" 
                                        checked={tempSelected.includes(String(val))} 
                                        onChange={() => handleCheckboxChange(String(val))} 
                                        style={{ cursor: "pointer" }} 
                                    />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val}</span>
                                </label>
                            ))
                        )}
                    </div>

                    {/* 4. OK / Cancel Buttons */}
                    <div style={{ padding: "8px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                        <button 
                            onClick={handleCancel} 
                            style={{ padding: "4px 16px", fontSize: "12px", border: "1px solid #d1d5db", borderRadius: "4px", backgroundColor: "white", cursor: "pointer" }}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleApply} 
                            style={{ padding: "4px 16px", fontSize: "12px", border: "none", borderRadius: "4px", backgroundColor: "#2563eb", color: "white", cursor: "pointer" }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterDropdown;