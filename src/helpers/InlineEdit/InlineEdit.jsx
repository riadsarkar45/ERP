import React, { useState } from 'react';
// import useAxiosPublic from '../../hooks/Axios';
import useAxiosPrivate from '../../hooks/UseAxiosPrivate';

const InlineEdit = () => {
    const [isEdit, setIsEdit] = useState({ isEditing: false, currentValue: "", rowId: "", updatedFieldName: "", compId: "" })
    const [changedField, setChangedField] = useState({ currentValue: "", name: "" })
    const [isUpdated, setIsUpdated] = useState("")
    // const axiosPublic = useAxiosPublic();
    const axiosSecure = useAxiosPrivate();
    const handleInlineEdit = (rowId, currentValue, updateTable, updatedFieldName, compId) => {
        console.log(rowId, currentValue, updateTable, updatedFieldName, compId, "compId");
        setIsEdit({ rowId: rowId, currentValue: currentValue, updatedFieldName: updatedFieldName, compId: compId })
        setChangedField({ currentValue: currentValue, })

    }

    const handleOnChange = (e) => {
        const { name, value } = e.target;
        setChangedField({ currentValue: value, name: name });
        setIsEdit(prev => ({ ...prev, currentValue: value, isEditing: true }));
    };

    console.log(isEdit, "isEdit");
    const handleRefresh = async () => {

        // const res = await axiosPublic.patch(`/update-work-order/${isEdit.rowId}`)
        // console.log(res.data);
    };

    const handleSubmit = async () => {
        try {
            const dataToUpdate = {
                [isEdit.updatedFieldName]: changedField.currentValue,
                rowId: isEdit.rowId,
                updatedFieldName: isEdit.updatedFieldName,
                compId: isEdit.compId
            };
            console.log(dataToUpdate);
            const res = await axiosSecure.patch(`/api/update-work-order/${isEdit.rowId}`, dataToUpdate);
            if (res.data === 'success') {
                setIsUpdated("success")
                console.log("success");
            }
        } catch (err) {
            console.error(err);
        }
    };



    return { handleInlineEdit, handleOnChange, isUpdated, handleRefresh, handleSubmit, changedField, isEdit };
};

export default InlineEdit;