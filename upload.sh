#!/bin/bash

C1="\033[0;32m"
C2="\033[0;34m"
CE="\033[0;31m"
NC="\033[0m"

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
if ! grep -q www-ftp.it-services.ruhr-uni-bochum.de ~/.ssh/known_hosts
then
	echo -e -n "${C2}Adding RUB SFTP to list of known hosts...\n"
	ssh-keyscan www-ftp.it-services.ruhr-uni-bochum.de >> ~/.ssh/known_hosts
	echo -e "${NC}\n"
fi

# retrieve remote version
echo -e "${C2}Retrieving version from server...\n"
sshpass -p "${pw}" sftp ${user}@www-ftp.it-services.ruhr-uni-bochum.de << EOF
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
echo -e "${C1}Below you can see the differences between the remote and the local version.${NC}\n"
diff -r fsr-mathe RELEASE 
echo ""

# confirm upload
echo -e -n "${C1}Do you want to upload the contents of RELEASE? [(y)es/(n)o] ${NC}"
read yesno
[[ ! $(echo "yes y") =~ (^|[[:space:]])${yesno}($|[[:space:]]) ]] && exit 0

# upload
cd RELEASE
echo -e "\n${C2}Uploading to server...\n"
sshpass -p "${pw}" sftp ${user}@www-ftp.it-services.ruhr-uni-bochum.de << EOF
cd fsr-mathe
put -r .
exit
EOF
echo -e "\nDone!${NC}"

exit 0
