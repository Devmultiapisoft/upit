// third-party
import { FormattedMessage } from 'react-intl';

// assets
import { Story, Fatrows, PresentionChart } from 'iconsax-react';

// type

// icons
const icons = {
  widgets: Story,
  statistics: Story,
  data: Fatrows,
  chart: PresentionChart
};

// ==============================|| MENU ITEMS - WIDGETS ||============================== //

const profile = {
  id: 'group-profile',
  title: <FormattedMessage id="User" />,
  icon: icons.widgets,
  type: 'group',
  children: [
    {
      id: 'profile',
      title: <FormattedMessage id="Profile" />,
      type: 'item',
      url: '/user/profile/',
      icon: icons.statistics
    },
    {
      id: 'team',
      title: <FormattedMessage id="Team" />,
      type: 'item',
      url: '/user/team/',
      icon: icons.chart
    },
    {
      id: 'directs',
      title: <FormattedMessage id="Directs" />,
      type: 'item',
      url: '/user/directs/',
      icon: icons.chart
    },
    {
      id: 'addFunds',
      title: <FormattedMessage id="Add Funds" />,
      type: 'item',
      url: '/user/add-funds',
      icon: icons.data
    },
    {
      id: 'withdrawFunds',
      title: <FormattedMessage id="Withdraw Funds" />,
      type: 'item',
      url: '/user/withdraw-funds',
      icon: icons.data
    },
    // {
    //   id: 'social-media',
    //   title: <FormattedMessage id="Verify & Get Tokens" />,
    //   type: 'item',
    //   url: '/user/social-media/',
    //   icon: icons.statistics
    // }
    // {
    //   id: 'w2wTransfers',
    //   title: <FormattedMessage id="W2W Transfers" />,
    //   type: 'item',
    //   url: '/user/w3w-transfers',
    //   icon: icons.data
    // },
    // {
    //   id: 'p2pTransfers',
    //   title: <FormattedMessage id="P2P Transfers" />,
    //   type: 'item',
    //   url: '/user/p2p-transfers',
    //   icon: icons.data
    // }
  ]
};

export default profile;
