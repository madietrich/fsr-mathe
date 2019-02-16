#!/bin/bash

# Verwendung: ./protokolle [yy] [so|wi]
# prüft folders/protokolle/[jahr][so/wi]se und erzeugt Inhalt automatisch unter pages/

sonum=(04 05 06 07 08 09)
sonam=(April Mai Juni Juli August September)
winum=(10 11 12 01 02 03)
winam=(Oktober November Dezember Januar Februar März)

valid=1

# prüfe Anzahl der Parameter
[[ $# -ne 2 ]] && valid=0

# prüfe ob der 1. Parameter zwischen 00 und 98 liegt und der 2. Parameter so oder wi ist
[[ ! $(echo {00..98}) =~ (^|[[:space:]])$1($|[[:space:]]) ]] && valid=0
[[ ! $(echo "so wi") =~ (^|[[:space:]])$2($|[[:space:]]) ]] && valid=0

# beende Skript bei ungültiger Eingabe
if [ $valid -ne 1 ]; then
	echo "ungültige Syntax. Verwendung: $0 [yy] [so|wi]"
	exit 1
fi

# überprüfe ob der entsprechende Ordner existiert
cont=$(ls folders/protokolle/$1$2se) && : || exit 1

# Auswahl der entsprechenden Arrays
Num=${2}num
Nam=${2}nam

# Anlegen der Dateien
if [[ $2 = so ]]; then
	t="SoSe '$1"; T1="Sommer"; T2="$1"
else
	Y=$((${1}+1)); t="WiSe '$1/'$Y"; T1="Winter"; T2="$1/20$Y"
fi
echo "Protokolle $t" > pages/protokolle_$1$2se.html.title
file=pages/protokolle_$1$2se.html.snippet
cp resources/protokolle_yyxxse.1.snippet $file
echo -e "\t\t\t\t\t\t\t<h3>${T1}semester 20${T2}</h3>" >> $file

# Anlegen der Einträge
y=$1
for i in {0..5}; do
# Monatszahl/-namen setzen
	num="${Num}[$i]"
	nam="${Nam}[$i]"
	m=${!num}
# für WiSe: Jahreszahl +1 für die 2. Hälfte
	[[ $2 = wi && $i -eq 3 ]] && y=$(($y+1))
	cont=$(ls folders/protokolle/$1$2se/Protokoll_20${y}_${m}_*.pdf 2>/dev/null)
	if [[ -n $cont ]]; then
		echo -e "\t\t\t\t\t\t\t<h4>${!nam} 20$y</h4>\n\t\t\t\t\t\t\t<div class="table-wrapper">\n\t\t\t\t\t\t\t\t<table>\n\t\t\t\t\t\t\t\t\t<tbody>" >> $file
		for j in $cont; do
			J=${j##*_}
			d=${J%.pdf}
			echo -e "\t\t\t\t\t\t\t\t\t\t<tr><td><a href=\"${j#folders/}\">20${y}/${m}/${d}</a></td></tr>" >> $file
		done
		echo -e "\t\t\t\t\t\t\t\t\t</tbody>\n\t\t\t\t\t\t\t\t</table>\n\t\t\t\t\t\t\t</div>" >> $file
	fi
done

cat resources/protokolle_yyxxse.2.snippet >> $file

echo "Protokollarchiv erfolgreich aktualisiert!"

