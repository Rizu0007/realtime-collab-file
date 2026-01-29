import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { DeleteResult, Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private userRepository: Repository<User>) {}
  create(createUserDto: CreateUserDto): Promise<User> {

    const user: User=new User();
    user.name = createUserDto.name;
    user.age = createUserDto.age;
    user.email = createUserDto.email;
    user.username = createUserDto.username;
    user.password = createUserDto.password;
    user.gender = createUserDto.gender;
    return this.userRepository.save(user)

  }

  findAlluser(): Promise<User[]> {
    return this.userRepository.find();
  }

    viewUser(id: number): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  updateuser(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    return this.userRepository.save({ ...updateUserDto, id });
  }

  removeUser(id: number) : Promise<DeleteResult> {
    return this.userRepository.delete(id)
  }
}
