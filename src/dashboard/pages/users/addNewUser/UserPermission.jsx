import React, { useState } from 'react'
import { UserRoundPlus } from 'lucide-react'
import PermissionSection from './PermissionSection'

/* ------------------------------------------------------------------ */
/*  Static configuration                                               */
/* ------------------------------------------------------------------ */

const USER_TYPES = [
    'SUPER ADMIN',
    'ADMIN',
    'MERCHANDISING',
    'FABRIC PLANNING',
    'FABRIC MANAGER',
    "QC'S",
    "AUDITOR'S",
    'MANAGEMENT',
]

// Helpers: an "EDIT / NO" item and a "YES / NO" item
const edit = (key, label) => ({ key, label, positive: 'EDIT' })
const yes = (key, label) => ({ key, label, positive: 'YES' })

// PRODUCTION DATA REPORT and PRODUCTION share the same columns
const PRODUCTION_ITEMS = [
    edit('summary', 'SUMMARY'),
    edit('dailyCuttingUpdate', 'DAILY CUTTING UPDATE'),
    edit('dailySewingUpdate', 'DAILY SEWING UPDATE'),
    yes('dailyFinishingUpdate', 'DAILY FINISHING UPDATE'),
    yes('dailyExportUpdate', 'DAILY EXPORT UPDATE'),
    yes('infoEdit', 'INFO. EDIT'),
    yes('readOnly', 'READ ONLY'),
]

const PERMISSION_SECTIONS = [
    {
        key: 'workOrders',
        title: "WORK ORDER'S",
        items: [
            edit('knittingWorkOrder', "KNITTING WORKORDER'S"),
            edit('ydWorkOrder', "Y/D WORKORDER'S"),
            edit('dyeingWorkOrder', "DYEING WORKORDER'S"),
            edit('aopWorkOrder', "AOP WORKORDER'S"),
            yes('readOnly', 'READ ONLY'),
        ],
    },
    {
        key: 'mis',
        title: 'MIS INFORMATION',
        items: [
            yes('knittingWorkOrder', "KNITTING WORKORDER'S"),
            yes('ydWorkOrder', "Y/D WORKORDER'S"),
            yes('dyeingWorkOrder', "DYEING WORKORDER'S"),
            yes('aopWorkOrder', "AOP WORKORDER'S"),
            yes('readOnly', 'READ ONLY'),
        ],
    },
    {
        key: 'workOrderApproval',
        title: 'WORKORDER REQ. & APPROVAL',
        items: [
            yes('workOrderReq', 'WORKORDER REQ. (ALL)'),
            yes('workOrderApp', 'WORKORDER APP. (ALL)'),
            yes('revisedWorkOrder', 'REVISED WORKORDER (ALL)'),
            yes('printWorkOrder', 'PRINT WORKORDER (ALL)'),
            yes('cancelWorkOrder', 'CANCEL WORKORDER (ALL)'),
            yes('readOnly', 'READ ONLY'),
        ],
    },
    {
        key: 'styleRequirements',
        title: 'STYLE REQUIREMENTS',
        items: [
            edit('addJob', 'ADD JOB'),
            edit('reconciliation', 'RECONCILIATION'),
            yes('bookingView', 'BOOKING VIEW'),
            yes('balanceSheet', 'BALANCE SHEET'),
            yes('infoEdit', 'INFO. EDIT'),
            yes('readOnly', 'READ ONLY'),
        ],
    },
    {
        key: 'yarn',
        title: 'YARN',
        items: [
            edit('yarnPurchase', 'YARN PURCHASE'),
            edit('yarnMovement', 'YARN MOVEMENT'),
            edit('rawYarnMovement', 'RAW YARN MOVEMENT'),
            edit('rawYarnStock', 'RAW YARN STOCK'),
            edit('ydMovement', 'Y/D MOVEMENT'),
            edit('ydStock', 'Y/D STOCK'),
            yes('readOnly', 'READ ONLY'),
        ],
    },
    {
        key: 'productionDataReport',
        title: 'PRODUCTION DATA REPORT',
        items: PRODUCTION_ITEMS,
    },
    {
        key: 'production',
        title: 'PRODUCTION',
        items: PRODUCTION_ITEMS,
    },
    {
        key: 'partyWiseView',
        title: 'PARTY WISE VIEW',
        items: [
            edit('knittingFilter', 'KNITTING FILTER'),
            yes('knittingDataExport', 'KNITTING DATA EXPORT'),
            edit('dyeingFilter', 'DYEING FILTER'),
            yes('dyeingDataExport', 'DYEING DATA EXPORT'),
            yes('aopFilter', 'AOP FILTER'),
            yes('aopDataExport', 'AOP DATA EXPORT'),
            yes('readOnly', 'READ ONLY'),
        ],
    },
    {
        key: 'movementBilling',
        title: 'MOVEMENT & BILLING',
        items: [
            edit('qtyEdit', 'QTY EDIT (ALL)'),
            yes('billingMake', 'BILLING MAKE (ALL)'),
            yes('billApproved', 'BILL APPROVED'),
            yes('challanInfoExport', 'CHALLAN INFO EXPORT (ALL)'),
            yes('priceChange', 'PRICE CHANGE'),
            yes('billInfoSee', 'BILL INFO SEE'),
            yes('readOnly', 'READ ONLY'),
        ],
    },
]

const ITEM_WIDTH = 230 // px per permission item (two checkbox columns)
const BORDER = 'border border-gray-600'

const INITIAL_USER_INFO = { name: '', designation: '', specialist: '' }

// Every section starts switched off with nothing selected
const buildInitialPermissions = () =>
    PERMISSION_SECTIONS.reduce((acc, section) => {
        acc[section.key] = {
            enabled: false,
            items: section.items.reduce((itemAcc, item) => {
                itemAcc[item.key] = null // 'yes' | 'no' | null
                return itemAcc
            }, {}),
        }
        return acc
    }, {})

/* ------------------------------------------------------------------ */
/*  One permission section (left checkbox + blue-header grid)          */
/* ------------------------------------------------------------------ */



/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const UserPermission = () => {
    const [showForm, setShowForm] = useState(true)
    const [userType, setUserType] = useState('')
    const [userInfo, setUserInfo] = useState(INITIAL_USER_INFO)
    const [permissions, setPermissions] = useState(buildInitialPermissions)
    const [error, setError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    const resetForm = () => {
        setUserType('')
        setUserInfo(INITIAL_USER_INFO)
        setPermissions(buildInitialPermissions())
        setError('')
    }

    // "ADD NEW USER" shows / hides the full table
    // const handleAddNewUser = () => {
    //     setSuccessMsg('')
    //     setShowForm((prev) => !prev)
    // }

    const handleInfoChange = (e) => {
        const { name, value } = e.target
        setUserInfo((prev) => ({ ...prev, [name]: value }))
    }

    const handleToggleSection = (sectionKey) => {
        setPermissions((prev) => ({
            ...prev,
            [sectionKey]: { ...prev[sectionKey], enabled: !prev[sectionKey].enabled },
        }))
    }

    // Clicking a ticked box again clears it
    const handleItemChange = (sectionKey, itemKey, choice) => {
        setPermissions((prev) => {
            const section = prev[sectionKey]
            const current = section.items[itemKey]
            return {
                ...prev,
                [sectionKey]: {
                    ...section,
                    items: { ...section.items, [itemKey]: current === choice ? null : choice },
                },
            }
        })
    }

    // The form stays visible (there is no Add New User button any more),
    // so Cancel only clears what has been entered.
    const handleCancel = () => {
        resetForm()
        setSuccessMsg('')
    }

    const handleSave = () => {
        setError('')
        setSuccessMsg('')

        if (!userType) {
            setError('Please select a type of user.')
            return
        }
        if (!userInfo.name.trim()) {
            setError('Please enter the user name.')
            return
        }

        // A permission is granted only when its section is on and EDIT / YES is ticked
        const permissionPayload = PERMISSION_SECTIONS.reduce((acc, section) => {
            const { enabled, items } = permissions[section.key]
            acc[section.key] = {
                enabled,
                items: section.items.reduce((itemAcc, item) => {
                    itemAcc[item.key] = enabled && items[item.key] === 'yes'
                    return itemAcc
                }, {}),
            }
            return acc
        }, {})

        const payload = {
            userType,
            name: userInfo.name.trim().toUpperCase(),
            designation: userInfo.designation.trim().toUpperCase(),
            specialist: userInfo.specialist.trim().toUpperCase(),
            permissions: permissionPayload,
        }

        // TODO: send `payload` to your API here
        console.log('User permission payload:', payload)

        resetForm()
        setSuccessMsg(`Permissions saved for ${payload.name}.`)
    }

    // White editable fields; text is shown in CAPITAL letters
    const fieldInput =
        'w-full bg-white px-2 py-1 text-sm text-gray-900 uppercase outline-none focus:bg-gray-50'
    const labelCell = `${BORDER} bg-white px-2 py-1 text-xs font-bold text-gray-900 whitespace-nowrap`

    return (
        <div className="space-y-5">
            {/* Add New User button
            <div className="flex flex-wrap items-center gap-4">
                <button
                    type="button"
                    onClick={handleAddNewUser}
                    aria-expanded={showForm}
                    className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold px-4 py-2 rounded-md transition-colors"
                >
                    <UserRoundPlus size={18} />
                    USER PERMISSION
                </button>
            </div> */}

            {showForm && (
                <>
                    {/* Type of user + user information */}
                    <div className="flex flex-col lg:flex-row items-start gap-2">
                        <div className={`${BORDER} bg-white w-full lg:w-40 shrink-0`}>
                            <label
                                htmlFor="user-type"
                                className="block border-b border-gray-600 py-1 text-xs font-bold text-center text-gray-900"
                            >
                                TYPE OF USER
                            </label>
                            <select
                                id="user-type"
                                value={userType}
                                onChange={(e) => setUserType(e.target.value)}
                                className="w-full bg-white px-2 py-2 text-sm text-gray-800 outline-none cursor-pointer"
                            >
                                <option value="">Select type of user</option>
                                {USER_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="w-full flex-1 overflow-x-auto">
                            <table className="w-full min-w-[640px] border-collapse bg-white">
                                <thead>
                                    <tr>
                                        <th
                                            colSpan={6}
                                            className={`${BORDER} py-1 text-xs font-bold text-gray-900 text-center`}
                                        >
                                            USER INFORMATION FIELD
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className={labelCell}>
                                            <label htmlFor="user-name">NAME :</label>
                                        </td>
                                        <td className={`${BORDER} p-1`}>
                                            <input
                                                id="user-name"
                                                name="name"
                                                type="text"
                                                value={userInfo.name}
                                                onChange={handleInfoChange}
                                                className={fieldInput}
                                                autoComplete="off"
                                            />
                                        </td>
                                        <td className={labelCell}>
                                            <label htmlFor="user-designation">DESIGNATION :</label>
                                        </td>
                                        <td className={`${BORDER} p-0`}>
                                            <input
                                                id="user-designation"
                                                name="designation"
                                                type="text"
                                                value={userInfo.designation}
                                                onChange={handleInfoChange}
                                                className={fieldInput}
                                                autoComplete="off"
                                            />
                                        </td>
                                        <td className={labelCell}>
                                            <label htmlFor="user-specialist">SPECIALIST :</label>
                                        </td>
                                        <td className={`${BORDER} p-0`}>
                                            <input
                                                id="user-specialist"
                                                name="specialist"
                                                type="text"
                                                value={userInfo.specialist}
                                                onChange={handleInfoChange}
                                                className={fieldInput}
                                                autoComplete="off"
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Permission sections */}
                    <div className="overflow-x-auto pb-2">
                        <div className="min-w-max space-y-5">
                            {PERMISSION_SECTIONS.map((section) => (
                                <PermissionSection
                                    key={section.key}
                                    section={section}
                                    sectionState={permissions[section.key]}
                                    onToggleSection={handleToggleSection}
                                    onItemChange={handleItemChange}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={handleSave}
                            className="bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold px-5 py-2 rounded-md transition-colors"
                        >
                            SAVE
                        </button>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-bold px-5 py-2 rounded-md transition-colors"
                        >
                            CANCEL
                        </button>
                        {error && (
                            <span className="text-sm font-medium text-red-600" role="alert">
                                {error}
                            </span>
                        )}
                        {successMsg && (
                            <span className="text-sm font-medium text-green-700" role="status">
                                {successMsg}
                            </span>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

export default UserPermission