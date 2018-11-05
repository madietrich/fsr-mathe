#!/bin/bash

if [ -e ./pages/*.html ]
then
	echo "ERROR: .html files do not belong in ./pages; please use .html.snippet and .html.title files"
	exit 1
fi

if [ ! -e ./resources/menu.html.snippet ]
then
	echo "ERROR: the menu file ./resources/menu.html.snippet does not exist"
	exit 1
fi

if [ ! -e ./resources/footer.html.snippet ]
then
	echo "ERROR: the footer file ./resources/footer.html.snippet does not exist"
	exit 1
fi

if [ -e ./RELEASE ]
then
	rm -rf ./RELEASE
fi

mkdir ./RELEASE

for i in ./pages/*.html.snippet
do
	j=${i%%.snippet}
	k=${j##*/}
	touch ./RELEASE/$k
	cat ./.do_not_alter/00.html.snippet >> ./RELEASE/$k
	if [ ! -e ./pages/.suffix.title ]
	then
		echo "ERROR: the title file ./pages/.suffix.title is missing, please create it"
		exit 1
	fi
	if [ -e $j.title ]
	then
		echo -n "<title>" >> ./RELEASE/$k
		if [ $(wc -l < $j.title) != 1 ]
		then
			echo "ERROR: too many lines in $i"
			exit 1
		fi
		if [ "$(cat $j.title)" != "*" ]
		then
			head -c -1 $j.title >> ./RELEASE/$k
			echo -n " - " >> ./RELEASE/$k
		fi
	else
		echo "Warning: $i has no associated .title file!"
	fi
	cat ./pages/.suffix.title >> ./RELEASE/$k
	echo "</title>" >> RELEASE/$k
	cat ./.do_not_alter/01.html.snippet >> ./RELEASE/$k
	cat ./resources/menu.html.snippet >> ./RELEASE/$k
	cat ./.do_not_alter/02.html.snippet >> ./RELEASE/$k
	cat $i >> ./RELEASE/$k
	cat ./resources/footer.html.snippet >> ./RELEASE/$k
	cat ./.do_not_alter/99.html.snippet >> ./RELEASE/$k
done

sed -i -e "s/<body>/<body class=\"landing\">/g" -e "s/<header id=\"header\">/<header id=\"header\" class=\"alt\">/g" ./RELEASE/index.html

cp -r ./folders/* ./RELEASE/
cp -r ./.do_not_alter/assets/ ./RELEASE/

rm ./RELEASE/images/licence

echo "Successfully built website to ./RELEASE"


