import CommonDatatable from 'helpers/CommonDatatable'
import { useMemo } from 'react';

export default function ROI(){

    const apiPoint = 'get-all-investments'

    const columns = useMemo(
        () => [
          {
            header: 'User ID',
            accessorKey: 'user_id'
          },
          {
            header: 'Plan ID',
            accessorKey: 'investment_plan_id'
          },
          {
            header: 'Amount',
            accessorKey: 'amount'
          },
          {
            header: 'Status',
            accessorKey: 'status'
            // meta: { className: 'cell-right' }
          },
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

    return <CommonDatatable columns={columns} apiPoint={apiPoint} />
}