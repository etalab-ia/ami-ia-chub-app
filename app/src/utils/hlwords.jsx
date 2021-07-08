import React from 'react';

export default (terms, mapClass = i => `hl-${i}`) => {
	const nterms = terms.filter(a => a).map(a => a.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

	const f = (a, stext, ntext) => {
		const [l, term, termIndex] = nterms.reduce((a, b, i) => (c => c > -1 && (a[0] === -1 || c < a[0]) ? [c, b, i] : a)(ntext.indexOf(b)), [-1, null, null]);

		return l > -1 ? f([...a,
			stext.slice(0, l),
			<span className={mapClass(termIndex)}>{stext.slice(l, l + term.length)}</span>,
		], stext.slice(l + term.length), ntext.slice(l + term.length)) : [...a, stext];
	}

	return text => {
		if (!(isNaN(text))) {text = String(text);}
		return text ? (stext => f([], stext, stext.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC')))(
			text.split(' ').filter(a => a && a !== 'NEWLINESEP').join(' ').normalize('NFC')) : text;
	};
}
