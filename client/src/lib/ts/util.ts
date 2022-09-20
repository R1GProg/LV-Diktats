export function readTextFile(file: File) {
	return new Promise<string | null>((res, rej) => {
		const reader = new FileReader();
		reader.onload = (event) => res(event.target?.result as string | null);
		reader.onerror = rej;
		reader.readAsText(file);
	});
}

export function downloadText(filename: string, text: string) {
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);
	
	element.style.display = 'none';
	document.body.appendChild(element);
	
	element.click();
	
	document.body.removeChild(element);
}
