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

const investments = {
  id: 'group-investments',
  title: <FormattedMessage id="investments" />,
  icon: icons.widgets,
  type: 'group',
  children: [
    {
      id: 'invest',
      title: <FormattedMessage id="Invest" />,
      type: 'item',
      url: '/investments/invest/',
      icon: icons.statistics
    },
    {
      id: 'data',
      title: <FormattedMessage id="Invest Reports" />,
      type: 'item',
      url: '/investments/invest-reports/',
      icon: icons.data
    }
  ]
};

export default investments;
