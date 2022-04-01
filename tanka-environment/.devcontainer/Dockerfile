FROM shinhwagk/tanka:1.0-vscode

RUN git clone --depth=1 https://gitee.com/gokuis/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
RUN sed -i 's/plugins=(git)/plugins=(git zsh-autosuggestions)/' ~/.zshrc