import { EnhancedChecklistItem } from './components/EnhancedChecklistItem';
import { ItemWithSubtasks } from './types';

const hooks = {
  'data.transform.item': (item: ItemWithSubtasks) => {
    console.log('Plugin data.transform.item called with:', item);
    if (!item.pluginData?.['subtasks-and-labels']) {
      const transformedItem = {
        ...item,
        pluginData: {
          ...item.pluginData,
          'subtasks-and-labels': {
            subtasks: [],
            labels: [],
            expanded: false
          }
        }
      };
      console.log('Plugin transformed item:', transformedItem);
      return transformedItem;
    }
    return item;
  },

  'ui.replace.ChecklistItem': (props: any) => {
    console.log('Plugin ui.replace.ChecklistItem called with:', props);
    const result = EnhancedChecklistItem({
      ...props,
      OriginalChecklistItem: props.component
    });
    console.log('Plugin rendered component:', result);
    return result;
  },

  'ui.modify.props': (props: any) => {
    console.log('Plugin ui.modify.props called with:', props);
    return props;
  }
};

export default hooks;