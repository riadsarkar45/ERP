import React from 'react';

const Header = ({ headerText = "Text not provided" }) => {
    return (
        <div className='border-b border-gray-200 mb-6 pb-4'>
            <h2 className='text-2xl font-semibold text-gray-800'>{headerText}</h2>
        </div>
    );
};

export default Header;