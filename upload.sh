#!/bin/bash

C1="\033[0;32m"
C2="\033[0;34m"
CE="\033[0;31m"
NC="\033[0m"

# check if necessary tools are installed
for program in sftp sshpass ssh-keyscan sed wget
do
	command -v ${program} >/dev/null 2>&1 || {
		echo -e "${CE}\"${program}\" is not installed on your system."
		echo -e "Please install the package providing this command and re-run this script.${NC}"
		exit 1
	}
done

# check if server is specified
if [ ! -e ./upload.server ]
then
	echo -e "${C1}You will need to specify the server address."
	echo -e "Alternatively, put the server address into the file \"upload.server\".${NC}"
	echo -e -n "${C1}Server: ${NC}"
	read srv
else
	read -r srv<upload.server
fi

# ask for login data
echo -e -n "${C1}Username: ${NC}"
read user
echo -e -n "${C1}Password (will not be echoed): ${NC}"
read -s pw
echo -e "\n"

if [ -z ${user} ] || [ -z ${pw} ]
then
	echo -e "${CE}Username and password cannot be empty strings!${NC}"
	exit 1
fi

# add server to list of known SSH hosts
if ! grep -q ${srv} ~/.ssh/known_hosts
then
	echo -e -n "${C2}Adding RUB SFTP to list of known hosts...\n"
	ssh-keyscan ${srv} >> ~/.ssh/known_hosts
	echo -e "${NC}\n"
fi

# retrieve remote version
echo -e "${C2}Retrieving version from server...\n"
rm -rf fsr-mathe
sshpass -p "${pw}" sftp ${user}@${srv} << EOF
get -r "fsr-mathe"
exit
EOF
echo -e "${NC}"
if ! [ -d "fsr-mathe" ]
then
	echo -e "${CE}The remote version could not be retrieved."
	echo -e "Please make sure you are running this script from within the"
	echo -e "university's network. (Try connecting to the VPN if you're at home.)${NC}"
	exit 1
fi

# compare versions
if ! [ -d "RELEASE" ]
then
	echo -e "${CE}The local version hasn't been generated yet."
	echo -e "Please execute ./build.sh and re-run this script.${NC}"
	exit 1
fi
echo -e "${C2}Comparing to local version...\n"
echo -e "${C1}Below you can see the differences between the remote and the local version."
echo -e "(\"fsr-mathe\" is the remote version, \"RELEASE\" is the local version.)${NC}\n"
difftotal=$(mktemp)
diff -r fsr-mathe RELEASE | tee ${difftotal} | less
if ! [ -s ${difftotal} ]
then
	echo -e "${CE}There are no differences. Exiting...${NC}"
	rm ${difftotal}
	exit 0
fi
echo ""

# retrieve Twitter feed
echo -e "${C2}Retrieving latest Twitter feed...\n\n${NC}"
wget -q https://nitter.net/fsr_mathe_rub/rss -O RELEASE/assets/rss

# confirm upload
echo -e -n "${C1}Do you want to upload the contents of RELEASE? [(y)es/(n)o] ${NC}"
read yesno
[[ ! $(echo "yes y") =~ (^|[[:space:]])${yesno}($|[[:space:]]) ]] && exit 0

# generate list of files to delete from webserver
localfile=$(mktemp)
localdir=$(mktemp)
remotefile=$(mktemp)
remotedir=$(mktemp)
difffile=$(mktemp)
diffdir=$(mktemp)
cd fsr-mathe
find . -type f | sort > ${remotefile}
find . -type d | sort > ${remotedir}
cd ..
cd RELEASE
find . -type f | sort > ${localfile}
find . -type d | sort > ${localdir}
cd ..
diff ${remotefile} ${localfile} > ${difffile}
diff ${remotedir} ${localdir} > ${diffdir}
sed -i -e '/^</!d' -e 's/< //' ${difffile}
sed -i -e '/^</!d' -e 's/< //' ${diffdir}
if [ -s ${difffile} ] || [ -s ${diffdir} ]
then
	if [ -s ${difffile} ]
	then
		echo -e "\n${C1}The following files will be deleted from the server:\n${CE}"
		cat ${difffile}
	fi
	if [ -s ${diffdir} ]
	then
		echo -e "\n${C1}The following folders will be deleted from the server:\n${CE}"
		cat ${diffdir}
	fi
	echo -e -n "\n${C1}Is this okay? [(y)es/(n)o] ${NC}"
	read yesno
	if [[ ! $(echo "yes y") =~ (^|[[:space:]])${yesno}($|[[:space:]]) ]]
	then
		echo -e "\n${C1}Not deleting files from the server. Please remove the files by yourself."
		delete=""
	else
		delete=1
	fi
fi

# prepare the request
request=$(mktemp)
echo "cd fsr-mathe" > ${request}
echo "put -r ." >> ${request}
if ! [ -z ${delete} ]
then
	while read file
	do
		echo "rm ${file}" >> ${request}
	done <${difffile}
	while read dir
	do
		echo "rmdir ${dir}" >> ${request}
	done <${diffdir}
fi
echo "exit" >> ${request}

# upload to the webserver
cd RELEASE
echo -e "\n${C2}Uploading to server...\n"
sshpass -p "${pw}" sftp ${user}@${srv} <${request}
cd ..
rm -f ${difftotal} ${localfile} ${localdir} ${remotefile} ${remotedir} ${difffile} ${diffdir} ${request}
echo -e "\nDone!${NC}"

# upload to git
echo -e -n "\n${C1}Please enter a commit message: ${NC}"
read cmsg
echo -e "\n${C2}"
git add . | cat
echo ""
git commit -m "${cmsg}" | cat
echo -e "\n${C1}Please check the above output and confirm the upload to git. [(y)es/(n)o] ${NC}"
read yesno
if  [[ ! $(echo "yes y") =~ (^|[[:space:]])${yesno}($|[[:space:]]) ]]
then
	git reset HEAD^
	echo -e "\n${CE}The staged commit has been deleted."
	echo -e "Please fix the problems, then upload the changed version to git."
else
	git push
fi
echo -e "\n${NC}"

exit 0
