import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Sample data — replace with your API data
const initialUsers = [
    { id: 1, name: 'Md. Rahim Uddin', designation: 'Merchandiser', type: 'Admin', joinDate: '2023-01-15', status: 'active' },
    { id: 2, name: 'Sabina Yesmin', designation: 'Sr. Merchandiser', type: 'Manager', joinDate: '2022-06-01', status: 'active' },
    { id: 3, name: 'Kamal Hossain', designation: 'Store Officer', type: 'User', joinDate: '2024-03-10', status: 'inactive' },
    { id: 4, name: 'Nasrin Akter', designation: 'Production Officer', type: 'User', joinDate: '2021-11-20', status: 'active' },
    { id: 5, name: 'Jahid Hasan', designation: 'Quality Controller', type: 'Auditor', joinDate: '2025-02-05', status: null },
]

// yyyy-mm-dd  ->  dd-mm-yyyy
const formatDate = (iso) => {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}-${m}-${y}`
}

const UserList = () => {
    const [users, setUsers] = useState(initialUsers)
    const navigate = useNavigate()

    // Checking a box sets that status; clicking the same box again clears it
    const handleStatusChange = (id, value) => {
        setUsers((prev) =>
            prev.map((user) =>
                user.id === id
                    ? { ...user, status: user.status === value ? null : value }
                    : user
            )
        )
    }

    const thBase = 'border border-gray-400 px-4 py-2 text-xs font-bold text-white bg-primary-500 text-center whitespace-nowrap'
    const tdBase = 'border border-gray-300 px-4 py-2 text-sm text-gray-800'

    return (
        <div className="bg-white rounded-md shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th rowSpan={2} className={`${thBase} w-20`}>SL. NO.</th>
                            <th rowSpan={2} className={thBase}>USER NAME</th>
                            <th rowSpan={2} className={thBase}>DESIGNATION</th>
                            <th rowSpan={2} className={thBase}>TYPE OF USER</th>
                            <th rowSpan={2} className={thBase}>DATE OF JOIN</th>
                            <th rowSpan={2} className={`${thBase} w-28`}>ACTION</th>
                            <th colSpan={2} className={thBase}>USER ACTIVITY</th>
                        </tr>
                        <tr>
                            <th className={`${thBase} w-28`}>ACTIVE</th>
                            <th className={`${thBase} w-28`}>IN-ACTIVE</th>
                        </tr>
                    </thead>

                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={8} className={`${tdBase} text-center text-gray-500 py-6`}>
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            users.map((user, index) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className={`${tdBase} text-center`}>{index + 1}</td>
                                    <td className={tdBase}>{user.name}</td>
                                    <td className={tdBase}>{user.designation}</td>
                                    <td className={`${tdBase} text-center`}>{user.type}</td>
                                    <td className={`${tdBase} text-center`}>{formatDate(user.joinDate)}</td>
                                    <td className={`${tdBase} text-center`}>
                                        <input
                                            type="checkbox"
                                            onChange={() => handleActionClick(user)}
                                            className="w-4 h-4 cursor-pointer accent-blue-600"
                                            aria-label={`Set permission for ${user.name}`}
                                        />
                                    </td>
                                    <td className={`${tdBase} text-center`}>
                                        <input
                                            type="checkbox"
                                            checked={user.status === 'active'}
                                            onChange={() => handleStatusChange(user.id, 'active')}
                                            className="w-4 h-4 cursor-pointer accent-green-600"
                                            aria-label={`Mark ${user.name} as active`}
                                        />
                                    </td>
                                    <td className={`${tdBase} text-center`}>
                                        <input
                                            type="checkbox"
                                            checked={user.status === 'inactive'}
                                            onChange={() => handleStatusChange(user.id, 'inactive')}
                                            className="w-4 h-4 cursor-pointer accent-red-600"
                                            aria-label={`Mark ${user.name} as in-active`}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default UserList