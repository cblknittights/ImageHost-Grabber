function ihg_toolbarButtonCommand(event) {
	if (event.target.id == "imagehostgrabber-toolbarbutton")
		ihg_Functions.hostGrabber(null, false);
}

function ihg_toolbarButtonClick(event) {
	if (isThread(content.document.location.href) == false) return;
	
	switch(event.button) {
		//case 0:
			// Left click
			//break;
		case 1:
			// Middle click
			ihg_Functions.leechThread();
			break;
		//case 2:
			// Right click
			//break;
		}
}