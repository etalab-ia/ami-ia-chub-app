export const shift = a => ([h, s, l]) => [(360 + h + a) % 360, s, l];
export const brighten = a => ([h, s, l]) => [h, s, l * (1 + a)];
export const darken = a => ([h, s, l]) => [h, s, l * (1 - a)];
export const saturate = a => ([h, s, l]) => [h, s * (1 + a), l];
export const desaturate = a => ([h, s, l]) => [h, s * (1 - a), l];
export const rgb = ([h, s, l]) => {
	const c = (1 - Math.abs(l * 2 - 1)) * s;
	const h2 = h / 60;
	const x = c * (1 - Math.abs(h2 % 2 - 1));
	const [r, g, b] = h2 >= 0 && h2 < 1 ? [c, x, 0]
		: (h2 >= 1 && h2 < 2 ? [x, c, 0]
			: (h2 >= 2 && h2 < 3 ? [0, c, x]
				: (h2 >= 3 && h2 < 4 ? [0, x, c]
					: (h2 >= 4 && h2 < 5 ? [x, 0, c]
						: (h2 >= 5 && h2 < 6 ? [c, 0, x] : [0, 0, 0])))));
	const m = l - (c / 2);
	return [r + m, g + m, b + m];
}
export const cssrgb = (c) => {
	const [r, g, b] = rgb(c);
	return '#' + Math.round(r * 0xff).toString(16).padStart(2, '0')
		+ Math.round(g * 0xff).toString(16).padStart(2, '0')
		+ Math.round(b * 0xff).toString(16).padStart(2, '0');
};
