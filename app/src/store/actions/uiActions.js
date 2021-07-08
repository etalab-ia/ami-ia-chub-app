import {PopinOrientation} from '../defs';

export const DISPLAY_TOOLTIP = 'DISPLAY_TOOLTIP';
export const REMOVE_TOOLTIP = 'REMOVE_TOOLTIP';
export const DISPLAY_POPIN = 'DISPLAY_POPIN';
export const REMOVE_POPIN = 'REMOVE_POPIN';

export const displayTooltip = text => ({type: DISPLAY_TOOLTIP, payload: text});
export const removeTooltip = () => ({type: REMOVE_TOOLTIP});
export const displayPopin = (content, anchor, size, orientation = PopinOrientation.UNSPECIFIED, onDismiss = null) =>
	({type: DISPLAY_POPIN, payload: {content, anchor, size, orientation, onDismiss}});
export const removePopin = () => ({type: REMOVE_POPIN});
