import { openSnackbar } from 'api/snackbar';
import CommonDatatable from 'helpers/CommonDatatable'
import { useEffect, useMemo, useState } from 'react';
import axios from 'utils/axios';
import UpdateProfile from 'myComponents/profile'
import { Button } from '@mui/material';
import axiosServices from 'utils/axios';
import ExportCSV from 'myComponents/ExportCSV';

export default function AllUsers() {

  // setUpdateProfile will fill user which means the admin wants to edit profile
  const [updateProfile, setUpdateProfile] = useState()

  const apiPoint = 'get-all-users'

  const logInUser = async (user_id) => {
    if (!user_id) return
    const res = await axios.post('/user-login-request', { user_id })
    if (res.status === 200)
      window.open(res.data?.result.url)
    else
      openSnackbar({
        open: true,
        message: res.data.msg,
        variant: 'alert',

        alert: {
          color: 'error'
        }
      })
  }

  const columns = useMemo(
    () => [
      {
        header: 'User ID',
        accessorKey: '_id',
        cell: (props) => {
          return <b
            style={{ cursor: "pointer" }}
            onClick={() => logInUser(props.getValue())}>
            {props.getValue()}
          </b>
        }
      },
      {
        header: 'Sponsor ID',
        accessorKey: 'refer_id'
      },
      {
        header: 'Name',
        accessorKey: 'name'
      },
      {
        header: 'Identifier',
        accessorKey: 'username'
      },
      {
        header: 'Phone Number',
        accessorKey: 'phone_number'
      },
      // {
      //   header: 'Position',
      //   accessorKey: 'position',
      //   cell: (props) => {
      //     return props.getValue() === 'L' ? "LEFT" : props.getValue() === 'R' ? "RIGHT" : '-'
      //   }
      // },
      {
        header: 'Wallet',
        accessorKey: 'wallet'
      },
      // {
      //   header: 'Topup Wallet',
      //   accessorKey: 'wallet_topup'
      // },
      {
        header: 'Total Investments',
        accessorKey: 'topup'
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
      },
      {
        header: 'Edit Profile',
        accessorKey: '',
        cell: (props) => {
          return <Button onClick={() => setUpdateProfile(props.cell.row.original)} variant={"shadow"} type='submit' color='primary'>Edit</Button>
        }
      },
    ],
    []
  );

  return <>

    <ExportCSV type={"allUsers"} />

    {
      updateProfile
        ? <UpdateProfile user={updateProfile} setUpdateProfile={setUpdateProfile} />
        : <CommonDatatable columns={columns} apiPoint={apiPoint} type={''} />
    }
  </>
}