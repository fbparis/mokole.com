col_labels = 'ABCDEFGHI'
rows_labels = '123456789'

grid_template_areas = []
areas_css = []
areas_html = []
for row in rows_labels:
	line = []
	for col in col_labels:
		line.append(f'{col}{row}')
		areas_css.append(f'.{col}{row} {{ grid-area: {col}{row}; }}')
		areas_html.append(f'<div class="{col}{row}"></div>')
	line = " ".join(line)
	grid_template_areas.append(f'"{line}"')
grid_template_areas = "\n".join(reversed(grid_template_areas))
areas_css = "\n".join(areas_css)
areas_html = "\n".join(areas_html)

print(grid_template_areas)
print(areas_css)
print(areas_html)