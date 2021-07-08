import makeEnum from '../utils/enum';

export const PopinOrientation = makeEnum({
	HORIZONTAL: 'horizontal',
	VERTICAL: 'vertical',
	UNSPECIFIED: null
});

export const SearchQueryMatching = makeEnum({
	EQUAL: 'equal',
	LIKE: 'like'
});

export const SearchQueryCombination = makeEnum({
	AND: 'and',
	OR: 'or'
});

export const LoginFormState = makeEnum({
	FRESH: 'FRESH',
	ATTEMPTING_LOGIN: 'ATTEMPTING_LOGIN',
	SESSION_EXPIRED: 'SESSION_EXPIRED',
	LOGGED_OUT: 'LOGGED_OUT',
	BAD_CREDENTIALS: 'BAD_CREDENTIALS',
	ERROR: 'ERROR'
});
