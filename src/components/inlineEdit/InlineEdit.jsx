import { Loader2 } from "lucide-react";
import { useState } from "react";

const InlineEdit = ({ value, fieldName }) => {

    const [inputValue, setInputValue] = useState(value);

    const handleSubmit = () => {
        const payload = {
            [fieldName]: inputValue
        }
        console.log("clicked", payload);
    };

    return (
        <div className="flex gap-2">
            <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        handleSubmit();
                    }
                }}
                className="border outline-none rounded-sm"
                autoFocus
                type="text"
            />
            <span className="animate-spin"><Loader2/></span>
        </div>
    );
};

export default InlineEdit;