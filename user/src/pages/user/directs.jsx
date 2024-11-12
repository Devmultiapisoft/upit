import CommonDatatable from 'helpers/CommonDatatable'
import { useMemo } from 'react';

export default function ROI() {

    const apiPoint = 'get-user-direct'

    const columns = useMemo(
        () => [
            {
                header: 'User ID',
                accessorKey: '_id'
            },
            {
                header: 'Identifier',
                accessorKey: 'username'
            },
            {
                header: 'Name',
                accessorKey: 'name'
            },
            {
                header: 'Mobile Number',
                accessorKey: 'phone_number'
            },
            // {
            //     header: 'Position',
            //     accessorKey: 'position',
            //     cell: (props) => {
            //         return props.getValue() === 'L' ? "Left" : "Right"
            //     },
            // },
            // {
            //     header: 'Investments',
            //     accessorKey: 'topup'
            // },
            {
                header: 'Date',
                accessorKey: 'created_at',
                // meta: { className: 'cell-right' }
                cell: (props) => {
                    return new Date(props.getValue()).toLocaleString();
                },
                enableColumnFilter: false,
                enableGrouping: false
            }
        ],
        []
    );

    return <CommonDatatable columns={columns} apiPoint={apiPoint} type={1} />
}