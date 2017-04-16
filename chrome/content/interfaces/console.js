var outBox = null;
var currentNode = null;

var Accessor =
{
	Write : null,
	WriteLine : null
}

function IhgConsoleWindow_onload()
{
	outBox = document.getElementById("lstOutput");

	currentNode = AddChildNode(outBox);

	Accessor.Write = Write;
	Accessor.WriteLine = WriteLine;

	var winArgs = window.arguments[0].wrappedJSObject;
	var callback = winArgs.Callback;
	callback();
}

function Write(text)
{
	var newText = text.replace("\r", "");
	var lines = newText.split("\n");

	var currentText = GetNodeText(currentNode);
	SetNodeText(currentNode, currentText + lines[0]);

	for (var i = 1; i < lines.length; i++)
	{
		currentNode = AddChildNode(outBox);
		SetNodeText(currentNode, lines[i]);
	}
}

function WriteLine(text)
{
	Write(text + "\n");
}

function AddChildNode(parentNode)
{
	var childNode = document.createElement("listitem");
	parentNode.appendChild(childNode);

	return childNode;
}

function SetNodeText(node, text)
{
	node.setAttribute("label", text);
}

function GetNodeText(node)
{
	var lblAttr = node.getAttribute("label");

	if (lblAttr == null)
		return "";
	else
		return lblAttr;
}