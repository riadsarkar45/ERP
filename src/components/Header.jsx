import React from 'react';

const Header = ({ headerText = "Text not provided" }) => {
    return (
        <div className='border-b mb-8 pb-3'>
            <h2>{headerText}</h2>
        </div>
    );
};

export default Header;