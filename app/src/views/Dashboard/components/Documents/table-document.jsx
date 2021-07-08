import React from 'react';
import "../../../../styles/table-document.css";

export default class TableDocument extends React.PureComponent {
	getRowKey = (row, i) => this.props.rowKey ? row[this.props.rowKey] : `${i},${this.props.columns.map(key => row[key]).join(',')}`;

	render() {
		return (
			<div className="table-document-container">
				<table className="table-document">
					<thead>
						<tr className="row-head">{this.props.columns.map(col => <th key={col.title}>{col.title}</th>)}</tr>
					</thead>

					<tbody>
						{this.props.data.map((row, i) => <tr key={this.getRowKey(row, i)} style={this.props.rowStyle ? this.props.rowStyle(row) : {}}>
							{this.props.columns.map(col => <td key={col.key} style={col.style ? col.style(row) : {}}>{row[col.key]}</td>)}
						</tr>)}
					</tbody>
				</table>
			</div>
		);
	}
}
