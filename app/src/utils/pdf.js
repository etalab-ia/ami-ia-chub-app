import {jsPDF} from 'jspdf';
import moment from 'moment';

const rasterizeSvg = (svg, width) => new Promise(resolve => {
	const img = document.createElement('img');

	img.addEventListener('load', () => {
		document.body.appendChild(img);
		const aspectRatio = img.clientHeight / img.clientWidth;
		const height = width * aspectRatio;
		document.body.removeChild(img);

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		const context = canvas.getContext('2d');
		context.drawImage(img, 0, 0, width, height);

		const png = canvas.toDataURL('image/png');
		resolve({data: png, width, height, aspectRatio});
	});

	img.setAttribute('src', `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
});

export const renderDocumentPdf = async (chart, table, patientName, documentTitle, dates = null, dpi = 300) => {
	const png = await rasterizeSvg(chart, (510.24 / 72) * dpi);

	const pdf = new jsPDF({unit: 'pt', format: 'a4', orientation: 'portrait', compress: true});
	pdf.setFont('Helvetica', '', '');
	pdf.setFontSize(12);
	pdf.text(patientName, 42.52, 42.52, {align: 'left', maxWidth: dates ? 250 : 510.24});

	if (dates)
		pdf.text(`${moment(dates[0]).format('DD/MM/YYYY')} - ${moment(dates[1]).format('DD/MM/YYYY')}`,
			552.76, 42.52, {align: 'right', maxWidth: 250});

	pdf.setFont('Helvetica', '', 'bold');
	pdf.setFontSize(16);
	pdf.text(documentTitle, 297.64, 70, {align: 'center', maxWidth: 510.24});

	const width = Math.min(png.width / dpi * 72, 510.24, 671.37 / png.aspectRatio);
	pdf.addImage(png.data, 'PNG', 42.52, 100, width, width * png.aspectRatio);

	if (table)
		pdf.table(42.52, 120 + width * png.aspectRatio,
			table.slice(1).map(a => a.reduce((a, b, i) => ({...a, [table[0][i][0]]: b}), {})),
			table[0].map(([name, wf]) => ({name, width: wf * 510.24 / ((0.264583 * 72) / 25.4)})),
			{margins: {left: 0, top: 42.52, bottom: 42.52, right: 0, width: 510.24}});

	const filename = (`${patientName} - ${documentTitle}`
		+ (dates ? ` - ${moment(dates[0]).format('DD/MM/YYYY')}-${moment(dates[1]).format('DD/MM/YYYY')}` : ''))
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC').replace(/[^A-Za-z0-9-_.]/g, '_') + '.pdf';

	const data = pdf.output('datauristring', {filename});

	return {data, filename};
}